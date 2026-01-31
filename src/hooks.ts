import fs from 'node:fs/promises';
import type { InitializeHook, LoadHook, ResolveHook } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import type { InitializeHookData } from './types.ts';

// ВАЖНО: не должен иметь флагов g и y чтобы не быть stateful
const extensionRegex = /\.(ts|tsx|mts|cts)$/;

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
  if (!extensionRegex.test(url)) {
    return next(url, context);
  }

  const source = await fs.readFile(new URL(url), 'utf-8');

  const output = ts.transpileModule(source, {
    fileName: url,
    compilerOptions: {
      ...data.compilerOptions,
      module: ts.ModuleKind.ESNext,
    },
  });

  return {
    format: 'module',
    source: output.outputText,
    shortCircuit: true,
  };
};
