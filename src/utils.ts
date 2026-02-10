import fs from 'node:fs';
import path from 'node:path';
import { CACHE_DIR } from './constants.ts';
import { getTypeScript } from './deps.ts';
import type { LoaderConfig } from './types.ts';

export async function defineLoaderConfig(sessionId: string): Promise<LoaderConfig> {
  let config: LoaderConfig;

  // файл конфига в кэше
  const cachePath = path.join(process.cwd(), CACHE_DIR, `${sessionId}.json`);

  if (fs.existsSync(cachePath)) {
    config = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  } else {
    // ищем файл конфига
    const ts = await getTypeScript();
    const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists);

    if (!configPath) {
      return {
        tsLoader: {
          skipCheck: false,
        },
      };
    }

    // читаем файл конфига
    const { config: rawConfig, error } = ts.readConfigFile(configPath, ts.sys.readFile);

    if (error) {
      // @todo возвращать из функции а не логировать и завершать процесс
      console.error(error.messageText);
      process.exit(1);
    }

    // парсим файл конфига
    const parsed = ts.parseJsonConfigFileContent(rawConfig, ts.sys, path.dirname(configPath));

    if (parsed.errors.length > 0) {
      // @todo возвращать из функции а не логировать и завершать процесс
      for (const error of parsed.errors) {
        console.error(error.messageText);
      }
      process.exit(1);
    }

    config = {
      configPath,
      configParsed: {
        fileNames: parsed.fileNames,
        options: parsed.options,
      },
      tsLoader: {
        skipCheck: rawConfig?.['ts-loader']?.skipCheck ?? false,
      },
    };

    // сохраняем файл конфига в кэш
    try {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });

      // wx бросит ошибку если кто-то уже пишет файл
      // @todo открывать дескриптор записи до поиска?
      fs.writeFileSync(cachePath, JSON.stringify(config), { flag: 'wx' });
    } catch {
      // noop
    }
  }

  return config;
}

export async function performTypeCheck(
  config: NonNullable<LoaderConfig['configParsed']>,
): Promise<{ ok: boolean }> {
  const ts = await getTypeScript();
  const program = ts.createProgram(config.fileNames, config.options);

  // ВАЖНО: вместо program.emit() просто собираем ошибки
  const diagnostics = [
    //
    ...program.getConfigFileParsingDiagnostics(),
    ...program.getOptionsDiagnostics(),
    ...ts.getPreEmitDiagnostics(program),
  ];

  if (config.options.declaration) {
    diagnostics.push(...program.getDeclarationDiagnostics());
  }

  if (diagnostics.length > 0) {
    const host = ts.createCompilerHost(config.options);

    // @todo возвращать из функции а не логировать
    ts.sys.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));

    return { ok: false };
  }

  return { ok: true };
}
