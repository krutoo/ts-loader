import { register } from 'node:module';
import type { InitializeHookData } from './types.ts';
import { defineConfig, defineIsChecker, performTypeCheck } from './utils.ts';

const TS_LOADER_INSTANCE_ID = process.env.TS_LOADER_INSTANCE_ID || `id${Date.now()}`;
const config = await defineConfig(TS_LOADER_INSTANCE_ID);

if (!process.env.TS_LOADER_CHECKER_DEFINED) {
  const isChecker = defineIsChecker(TS_LOADER_INSTANCE_ID);

  if (isChecker) {
    if (!config.tsLoader.skipCheck) {
      const checking = await performTypeCheck(config);

      if (!checking.ok) {
        process.exit(1);
      }
    }

    process.env.TS_LOADER_CHECKER_DEFINED = 'true';
    process.env.TS_LOADER_INSTANCE_ID = TS_LOADER_INSTANCE_ID;
  }
}

register('./hooks.js', {
  parentURL: import.meta.url,
  data: { compilerOptions: config.options } satisfies InitializeHookData,
});
