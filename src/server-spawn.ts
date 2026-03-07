import { spawn } from 'node:child_process';
import path from 'node:path';
import { createInterface } from 'node:readline';
import type { LoaderConfig } from './types.ts';

// ВАЖНО: Node.js 24.12+ почему-то не дает серверу получать запросы
// если он запускается в основном процессе загрузчика
// поэтому используем spawn чтобы запустить сервер в отдельном процессе
export async function spawnServerProcess(config: LoaderConfig): Promise<{ port: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [path.resolve(import.meta.dirname, 'server-run.js')], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env: {
        PATH: process.env.PATH,
        NODE_PATH: process.env.NODE_PATH,
        NODE_ENV: 'production',
        TERM: 'dumb',
        NO_COLOR: '1',
        NODE_OPTIONS: '--no-warnings --no-deprecation',
      },
    });

    child.stderr.on('data', data => {
      process.stderr.write(`[ts-loader] Server error: ${data}`);
    });

    const rl = createInterface({ input: child.stdout });

    rl.on('line', line => {
      const prefix = '[TS_LOADER_SERVER_PORT]:';

      if (line.startsWith(prefix)) {
        // чтобы процесс не висел из-за дочернего с сервером
        // - ломаем потоки вывода
        // - отвязывает процесс
        child.stdout.destroy();
        child.stderr.destroy();
        child.unref();

        resolve({
          port: line.replace(prefix, ''),
        });
      }
    });

    child.on('error', error => {
      reject(error);
    });

    child.on('exit', code => {
      if (code !== 0) {
        reject(new Error(`[ts-loader] Server exited with code ${code}`));
      }
    });

    const shutdown = (code = 0) => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
      process.exit(code);
    };

    process.on('exit', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('uncaughtException', () => shutdown(1));
  });
}
