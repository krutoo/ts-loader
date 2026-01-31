import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { register } from 'node:module';
import ts from 'typescript';
import type { InitializeHookData } from './types.ts';
import { CACHE_DIR } from './constants.ts';

// ищем файл конфига
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
const config = ts.parseJsonConfigFileContent(rawConfig, ts.sys, path.dirname(configPath));

if (config.errors.length > 0) {
  for (const error of config.errors) {
    console.error(error.messageText);
  }
  process.exit(1);
}

// включаем блокировку повторного typecheck в рамках одного и того же родительского процесса
// это нужно например для node --test когда в рамках процесса register запускается несколько раз
const lockPath = path.join(process.cwd(), CACHE_DIR, `typecheck-${process.ppid}.lock`);

let needTypeCheck = false;

try {
  // @todo придумать как удалять созданные lock-файлы либо поменять подход
  mkdirSync(path.dirname(lockPath), { recursive: true });
  writeFileSync(lockPath, '', { flag: 'wx' }); // wx выбросит ошибку если кто-то уже записал файл
  needTypeCheck = true;
} catch {}

// выполняем typecheck
if (needTypeCheck) {
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
