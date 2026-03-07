import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CACHE_DIR } from './constants.ts';
import { getTypeScript } from './deps.ts';
import { FileCache } from './shared/file-cache.ts';
import { once } from './shared/once.ts';
import type { LoaderConfig } from './types.ts';

interface HandlerContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
}

async function getFileHashSalt(filename: string) {
  const { mtimeMs, size } = await fs.stat(filename);

  return `${filename}-${mtimeMs}-${size}`;
}

export function createHttpServer(config: LoaderConfig): Server {
  const getResolutionCache = once(async () => {
    const ts = await getTypeScript();

    return ts.createModuleResolutionCache(process.cwd(), s => s, config.configParsed?.options);
  });

  const getConfigHashSalt = once(() => {
    return getFileHashSalt(config.configPath ?? '');
  });

  const getFileCache = once(() => {
    return new FileCache({
      cacheDir: path.join(process.cwd(), CACHE_DIR, 'transpiled'),
      async hashFile(filename) {
        // ВАЖНО: учитываем и сам файл, и файл tsconfig.json
        const hash = createHash('md5')
          .update(await getConfigHashSalt())
          .update(await getFileHashSalt(filename));

        return hash.digest('hex');
      },
    });
  });

  const handleResolve = async ({ res, url }: HandlerContext) => {
    const specifier = url.searchParams.get('specifier');
    const parent = url.searchParams.get('parentUrl');

    if (!specifier) {
      res.writeHead(422, 'Invalid payload', { 'content-type': 'text/plain' });
      res.end('Invalid payload');
      return;
    }

    const ts = await getTypeScript();
    const resolutionCache = await getResolutionCache();
    const containingFile = parent
      ? fileURLToPath(parent)
      : path.join(process.cwd(), 'nonexistent.ts');

    const { resolvedModule } = ts.resolveModuleName(
      specifier,
      containingFile,
      config.configParsed?.options ?? {},
      ts.sys,
      resolutionCache,
    );

    if (!resolvedModule || resolvedModule.isExternalLibraryImport) {
      res.writeHead(404, 'Not found', { 'content-type': 'text/plain' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, 'Success', { 'content-type': 'text/plain' });
    res.end(pathToFileURL(resolvedModule.resolvedFileName).href);
  };

  const handleTranspile = async ({ res, url }: HandlerContext) => {
    const fileUrl = url.searchParams.get('fileUrl');

    if (!fileUrl) {
      res.writeHead(422, 'Invalid payload', { 'content-type': 'text/plain' });
      res.end('Invalid payload');
      return;
    }

    const fileCache = getFileCache();
    const fileName = fileURLToPath(fileUrl);
    const cachePath = await fileCache.getItemPath(fileName);

    // проверяем наличие в кэше
    if (fileCache.hasItem(cachePath)) {
      res.writeHead(200, 'Found', { 'content-type': 'text/plain' });
      res.end(cachePath);
      return;
    }

    // если в кэше нет — читаем
    const source = await fs.readFile(fileName, 'utf-8');

    // компилируем
    const ts = await getTypeScript();
    const output = ts.transpileModule(source, {
      fileName,
      compilerOptions: {
        ...config.configParsed?.options,

        // @todo надо ли ставить CommonJS если у fileName расширение .cts?
        module: ts.ModuleKind.ESNext,
      },
      reportDiagnostics: false,
    });

    // сохраняем в кэш
    await fileCache.setItem(cachePath, output.outputText);

    res.writeHead(200, 'Created', { 'content-type': 'text/plain' });
    res.end(cachePath);
  };

  const routes = [
    {
      match: (ctx: HandlerContext) => ctx.req.method === 'GET' && ctx.url.pathname === '/resolve',
      handle: handleResolve,
    },
    {
      match: (ctx: HandlerContext) => ctx.req.method === 'GET' && ctx.url.pathname === '/transpile',
      handle: handleTranspile,
    },
  ];

  const server = createServer(async (req, res) => {
    try {
      const ctx: HandlerContext = {
        req,
        res,
        url: new URL(req.url!, 'http://localhost:3000'),
      };

      for (const route of routes) {
        if (route.match(ctx)) {
          await route.handle(ctx);
          break;
        }
      }

      if (!res.writableEnded) {
        res.writeHead(404, 'Not found', { 'content-type': 'text/plain' });
        res.end('Not found');
      }
    } catch (error) {
      res.writeHead(500, 'Internal error', { 'content-type': 'text/plain' });
      res.end(String(error));
    }
  });

  return server;
}
