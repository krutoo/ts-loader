import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { InitializeHook, LoadHook, ResolveFnOutput, ResolveHook } from 'node:module';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import type { CompilerOptions, ModuleResolutionCache } from 'typescript';
import type { InitializeHookData } from './types.ts';
import { getTypeScript } from './deps.ts';
import { CACHE_DIR } from './constants.ts';

// ВАЖНО: не должен иметь флагов g и y чтобы не быть stateful
const EXT_REGEX = /\.(jsx|ts|tsx|mts|cts)$/;

const TRANSPILE_CACHE_DIR = path.join(process.cwd(), CACHE_DIR, 'transpilation');

const RECURSIVE = { recursive: true };

let data: InitializeHookData;
let transpileOptions: CompilerOptions;
let resolutionCache: ModuleResolutionCache;

export const initialize: InitializeHook = async (initData: InitializeHookData) => {
  const ts = await getTypeScript();

  data = initData;

  resolutionCache = ts.createModuleResolutionCache(process.cwd(), s => s, data.compilerOptions);

  // для транспиляции берем только то, что важно
  transpileOptions = {
    // ВАЖНО: без этого почему-то иногда на выходе всё равно CommonJS
    module: ts.ModuleKind.ESNext,

    target: data.compilerOptions.target,
    baseUrl: data.compilerOptions.baseUrl,
    rootDir: data.compilerOptions.rootDir,
    jsx: data.compilerOptions.jsx,
    jsxFactory: data.compilerOptions.jsxFactory,
    jsxImportSource: data.compilerOptions.jsxImportSource,
    jsxFragmentFactory: data.compilerOptions.jsxFragmentFactory,
    declaration: false,
    declarationMap: false,
    sourceMap: false,
    incremental: false,
    tsBuildInfoFile: undefined,
    checkJs: false,
    skipLibCheck: true,
    noEmitHelpers: true,
    importHelpers: true,
    removeComments: true,
    types: [],
    lib: [],
  };
};

export const resolve: ResolveHook = async (specifier, context, next) => {
  if (!context.parentURL || specifier.startsWith('node:')) {
    return next(specifier, context);
  }

  let resolved: ResolveFnOutput | undefined;

  try {
    resolved = await next(specifier, context);
  } catch {}

  if (resolved && resolved.url.includes('/node_modules/')) {
    return { ...resolved, shortCircuit: true };
  }

  const ts = await getTypeScript();
  const { resolvedModule } = ts.resolveModuleName(
    specifier,
    fileURLToPath(context.parentURL),
    data.compilerOptions,
    ts.sys,
    resolutionCache,
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
  if (!EXT_REGEX.test(url)) {
    return next(url, context);
  }

  // создаем ключ кэша используя хэш имени и хэш содержимого
  // @todo учитывать mtimeMs, size файла tsconfig.json
  const fileName = fileURLToPath(url);
  const { mtimeMs, size } = await fs.stat(fileName);
  const cacheKey = createHash('md5').update(`${url}-${mtimeMs}-${size}`).digest('hex');
  const cachePath = path.join(TRANSPILE_CACHE_DIR, `${cacheKey}.js`);

  // проверяем наличие в кэше
  if (existsSync(cachePath)) {
    return {
      format: 'module',
      source: await fs.readFile(cachePath, 'utf8'),
      shortCircuit: true,
    };
  }

  // если в кэше нет — читаем
  const source = await fs.readFile(fileURLToPath(url), 'utf-8');

  // компилируем
  const ts = await getTypeScript();
  const output = ts.transpileModule(source, {
    fileName,
    compilerOptions: transpileOptions,
    reportDiagnostics: false,
  });

  // сохраняем в кэш
  // @todo придумать как удалять неактуальный кэш
  await fs.mkdir(path.dirname(cachePath), RECURSIVE);
  await fs.writeFile(cachePath, output.outputText);

  return {
    format: 'module',
    source: output.outputText,
    shortCircuit: true,
  };
};
