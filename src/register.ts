import { register } from 'node:module';
import type { AddressInfo } from 'node:net';
import type { InitializeHookData } from './types.ts';
import { defineConfig, performTypeCheck } from './utils.ts';
import { createLoaderServer } from './server.ts';

const sessionId = process.env.TS_LOADER_SESSION_ID || `id${Date.now()}`;
const config = await defineConfig(sessionId);

// главный процесс отвечает за typecheck и запуск сервера
if (!process.env.TS_LOADER_SESSION_ID) {
  process.env.TS_LOADER_SESSION_ID = sessionId;

  if (!config.tsLoader.skipCheck) {
    const checking = await performTypeCheck(config);

    if (!checking.ok) {
      process.exit(1);
    }
  }

  const server = createLoaderServer(config);

  server.unref();

  await new Promise<void>(done => {
    server.listen(0, () => {
      const address = server.address() as AddressInfo;
      const port = address.port;

      process.env.TS_LOADER_PORT = `${port}`;

      done();
    });
  });
}

register('./hooks.js', {
  parentURL: import.meta.url,
  data: {
    port: process.env.TS_LOADER_PORT!,
  } satisfies InitializeHookData,
});
