import fs from 'node:fs/promises';
import {
  type InitializeHook,
  type LoadHook,
  type ResolveFnOutput,
  type ResolveHook,
  isBuiltin,
} from 'node:module';
import { createHttpApi } from './api.ts';
import type { Api, InitializeHookData } from './types.ts';

// ВАЖНО: не должен иметь флагов g и y чтобы не быть stateful
const EXT_REGEX = /\.(jsx|ts|tsx|mts|cts)$/;

let api: Api;

export const initialize: InitializeHook = (initData: InitializeHookData) => {
  api = createHttpApi({
    // ВАЖНО: чтобы не запрашивать таблицу хостов сразу идем на 127.0.0.1
    baseUrl: `http://127.0.0.1:${initData.port}`,
  });
};

export const resolve: ResolveHook = async (specifier, context, next) => {
  if (specifier.startsWith('node:') || isBuiltin(specifier)) {
    return next(specifier, context);
  }

  let resolved: ResolveFnOutput | undefined;

  try {
    resolved = await next(specifier, context);
  } catch {
    // noop
  }

  if (resolved && resolved.url.includes('/node_modules/')) {
    return { ...resolved, shortCircuit: true };
  }

  const result = await api.resolve({
    specifier,
    parentUrl: context.parentURL,
  });

  if (!result) {
    return resolved ?? next(specifier, context);
  }

  return {
    format: 'module',
    url: result,
    shortCircuit: true,
  };
};

export const load: LoadHook = async (url, context, next) => {
  if (!EXT_REGEX.test(url)) {
    return next(url, context);
  }

  const result = await api.transpile({
    fileUrl: url,
  });

  if (!result) {
    throw new Error(`Failed to load "${url}"`);
  }

  return {
    format: 'module',
    source: await fs.readFile(result, 'utf-8'),
    shortCircuit: true,
  };
};
