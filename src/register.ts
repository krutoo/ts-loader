import { register } from 'node:module';
import { spawnServerProcess } from './server-spawn.ts';
import type { InitializeHookData } from './types.ts';
import { defineLoaderConfig, performTypeCheck } from './utils.ts';

const sessionId = process.env.TS_LOADER_SESSION_ID || `id${Date.now()}`;
const config = await defineLoaderConfig(sessionId);

// главный процесс отвечает за typecheck и запуск сервера
if (!process.env.TS_LOADER_SESSION_ID) {
  process.env.TS_LOADER_SESSION_ID = sessionId;

  if (config.configPath && config.configParsed && !config.tsLoader.skipCheck) {
    const checking = await performTypeCheck(config.configParsed);

    if (!checking.ok) {
      process.exit(1);
    }
  }

  const serverInfo = await spawnServerProcess(config);

  process.env.TS_LOADER_PORT = serverInfo.port;
}

register('./hooks.js', {
  parentURL: import.meta.url,
  data: {
    port: process.env.TS_LOADER_PORT!,
  } satisfies InitializeHookData,
});
