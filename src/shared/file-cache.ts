import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface FileCacheOptions {
  cacheDir: string;
  hashFile?: (filename: string) => string | Promise<string>;
}

export class FileCache {
  cacheDir: string;
  hashFile: (filename: string) => string | Promise<string>;

  constructor({ cacheDir, hashFile = FileCache.shallowHashFile }: FileCacheOptions) {
    this.cacheDir = cacheDir;
    this.hashFile = hashFile;
  }

  static async shallowHashFile(filename: string): Promise<string> {
    const { mtimeMs, size } = await fs.stat(filename);

    return createHash('md5').update(`${filename}-${mtimeMs}-${size}`).digest('hex');
  }

  async getItemPath(filename: string): Promise<string> {
    const cacheKey = await this.hashFile(filename);

    return path.join(this.cacheDir, cacheKey);
  }

  hasItem(itemPath: string): boolean {
    return existsSync(itemPath);
  }

  async getItem(itemPath: string): Promise<string> {
    return await fs.readFile(itemPath, 'utf8');
  }

  async setItem(itemPath: string, content: string): Promise<void> {
    // @todo придумать как удалять неактуальный кэш
    // можно использовать доп проверку изменения файла и если изменился то удалять старый кэш
    await fs.mkdir(path.dirname(itemPath), { recursive: true });
    await fs.writeFile(itemPath, content);
  }
}
