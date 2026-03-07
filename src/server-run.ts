import type { AddressInfo } from 'node:net';
import { createHttpServer } from './server.ts';
import { defineLoaderConfig } from './utils.ts';

const config = await defineLoaderConfig(process.env.TS_LOADER_SESSION_ID!);
const server = createHttpServer(config);

server.listen(0, '127.0.0.1', () => {
  const { port } = server.address() as AddressInfo;

  process.stdout.write(`[TS_LOADER_SERVER_PORT]:${port}\n`);
});
