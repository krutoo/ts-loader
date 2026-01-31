import fs from 'node:fs/promises';
import type { InitializeHook, LoadHook, ResolveHook } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import type { InitializeHookData } from './types.ts';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';

// ВАЖНО: не должен иметь флагов g и y чтобы не быть stateful
const EXT_REGEX = /\.(jsx|ts|tsx|mts|cts)$/;

const CACHE_DIR = path.join(process.cwd(), 'node_modules/.cache/@krutoo/ts-loader/transpilation');

let data: InitializeHookData;
let host: ts.CompilerHost;

export const initialize: InitializeHook = (initData: InitializeHookData) => {
  data = initData;
  host = ts.createCompilerHost(data.compilerOptions);
};

export const resolve: ResolveHook = (specifier, context, next) => {
  if (!context.parentURL) {
    return next(specifier, context);
  }

  const { resolvedModule } = ts.resolveModuleName(
    specifier,
    fileURLToPath(context.parentURL),
    data.compilerOptions,
    host,
  );

  if (!resolvedModule || resolvedModule.isExternalLibraryImport) {
    return next(specifier, context);
  }

  return {
    format: 'module',
    url: pathToFileURL(resolvedModule.resolvedFileName).href,
    shortCircuit: true,
  };
};

export const load: LoadHook = async (url, context, next) => {
  // @todo не уверен что так стоит делать...
  if (!EXT_REGEX.test(url)) {
    return next(url, context);
  }

  // читаем
  const source = await fs.readFile(fileURLToPath(url), 'utf-8');

  // создаем хэш для имени и хэш для содержимого
  const nameHash = createHash('md5').update(url).digest('hex');

  const contentHash = createHash('sha256')
    .update(source)
    .update(JSON.stringify(data.compilerOptions))
    .digest('hex');

  const cachePath = path.join(CACHE_DIR, `${nameHash}-${contentHash}.js`);

  // проверяем наличие в кэше
  if (existsSync(cachePath)) {
    return {
      format: 'module',
      shortCircuit: true,
      source: await fs.readFile(cachePath, 'utf8'),
    };
  }

  // если в кэше нет — компилируем
  const output = ts.transpileModule(source, {
    fileName: url,
    compilerOptions: {
      ...data.compilerOptions,

      // ВАЖНО: без этого почему-то иногда на выходе всё равно CommonJS
      module: ts.ModuleKind.ESNext,
    },
  });

  // сохраняем в кэш
  // @todo придумать как удалять неактуальный кэш
  await fs.mkdir(path.dirname(cachePath), { recursive: true });
  await fs.writeFile(cachePath, output.outputText);

  return {
    format: 'module',
    source: output.outputText,
    shortCircuit: true,
  };
};
