import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import type { ParsedCommandLine } from 'typescript';
import type { InitializeHookData } from './types.ts';
import { CACHE_DIR } from './constants.ts';
import { getTypeScript } from './deps.ts';

let config: Pick<ParsedCommandLine, 'fileNames' | 'options'>;
let needTypeCheck = false;

// файл конфига в кэше (для родительского процесса)
const cachePath = path.join(process.cwd(), CACHE_DIR, `typecheck-${process.ppid}.json`);

if (existsSync(cachePath)) {
  console.log('');
  config = JSON.parse(readFileSync(cachePath, 'utf-8'));
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
    console.error(error.messageText);
    process.exit(1);
  }

  // парсим файл конфига
  const parsed = ts.parseJsonConfigFileContent(rawConfig, ts.sys, path.dirname(configPath));

  if (parsed.errors.length > 0) {
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
    mkdirSync(path.dirname(cachePath), { recursive: true });

    // wx выбросит ошибку если кто-то уже записал файл
    // @todo открывать дескриптор записи до поиска?
    writeFileSync(cachePath, JSON.stringify(config), { flag: 'wx' });
    needTypeCheck = true;
  } catch {}
}

// выполняем typecheck
if (needTypeCheck) {
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
    process.exit(1);
  }
}

register('./hooks.js', {
  parentURL: import.meta.url,
  data: { compilerOptions: config.options } satisfies InitializeHookData,
});
