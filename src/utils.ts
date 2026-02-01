import fs from 'node:fs';
import path from 'node:path';
import { getTypeScript } from './deps.ts';
import { CACHE_DIR } from './constants.ts';
import type { ParsedCommandLine } from 'typescript';

export type Config = Pick<ParsedCommandLine, 'fileNames' | 'options'>;

export async function defineConfig(instanceId: string): Promise<Config> {
  let config: Config;

  // файл конфига в кэше (для родительского процесса)
  const cachePath = path.join(process.cwd(), CACHE_DIR, `typecheck-${instanceId}.json`);

  if (fs.existsSync(cachePath)) {
    config = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
  } else {
    // ищем файл конфига в проекте
    const ts = await getTypeScript();
    const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists);

    if (!configPath) {
      throw new Error('Config file not found');
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
      fileNames: parsed.fileNames,
      options: parsed.options,
    };

    // сохраняем файл конфига в кэш
    try {
      fs.mkdirSync(path.dirname(cachePath), { recursive: true });

      // wx выбросит ошибку если кто-то уже записал файл
      // @todo открывать дескриптор записи до поиска?
      fs.writeFileSync(cachePath, JSON.stringify(config), { flag: 'wx' });
    } catch {}
  }

  return config;
}

export function defineIsChecker(instanceId: string): boolean {
  const lockPath = path.join(process.cwd(), CACHE_DIR, `typecheck-${instanceId}.lock`);
  let isChecker = false;

  if (!fs.existsSync(lockPath)) {
    try {
      fs.mkdirSync(path.dirname(lockPath), { recursive: true });
      fs.writeFileSync(lockPath, '', { flag: 'wx' }); // wx упадет если кто-то уже начал писать в файл
      isChecker = true;
    } catch {}
  }

  return isChecker;
}

export async function performTypeCheck(config: Config): Promise<{ ok: boolean }> {
  const ts = await getTypeScript();
  const program = ts.createProgram(config.fileNames, config.options);

  // ВАЖНО: вместо program.emit() просто собираем все ошибки
  const diagnostics = [
    ...program.getOptionsDiagnostics(),
    ...program.getGlobalDiagnostics(),
    ...program.getSyntacticDiagnostics(),
    ...program.getSemanticDiagnostics(),
    ...program.getDeclarationDiagnostics(),
    ...program.getConfigFileParsingDiagnostics(),
  ];

  if (diagnostics.length > 0) {
    const host = ts.createCompilerHost(config.options);

    ts.sys.write(ts.formatDiagnosticsWithColorAndContext(diagnostics, host));

    return { ok: false };
  }

  return { ok: true };
}
