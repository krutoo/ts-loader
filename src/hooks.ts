import fs from 'node:fs/promises';
import {
  type InitializeHook,
  type LoadHook,
  type ResolveFnOutput,
  type ResolveHook,
  isBuiltin,
} from 'node:module';
import type { InitializeHookData } from './types.ts';

// ВАЖНО: не должен иметь флагов g и y чтобы не быть stateful
const EXT_REGEX = /\.(jsx|ts|tsx|mts|cts)$/;

let data: InitializeHookData;

export const initialize: InitializeHook = (initData: InitializeHookData) => {
  data = initData;
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

  const apiUrl = new URL(`http://localhost:${data.port}/resolve`);

  apiUrl.searchParams.set('specifier', specifier);

  if (context.parentURL) {
    apiUrl.searchParams.set('parent', context.parentURL);
  }

  const res = await fetch(apiUrl);

  if (!res.ok) {
    return resolved ?? next(specifier, context);
  }

  return {
    format: 'module',
    url: await res.text(),
    shortCircuit: true,
  };
};

export const load: LoadHook = async (url, context, next) => {
  if (!EXT_REGEX.test(url)) {
    return next(url, context);
  }

  const apiUrl = new URL(`http://localhost:${data.port}/transpile`);

  apiUrl.searchParams.set('fileUrl', url);

  const res = await fetch(apiUrl);

  if (!res.ok) {
    throw new Error(`Failed to load "${url}"`);
  }

  return {
    format: 'module',
    source: await fs.readFile(await res.text(), 'utf-8'),
    shortCircuit: true,
  };
};
