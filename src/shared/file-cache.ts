import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

export class FileCache {
  cacheDir: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
  }

  async getItemPath(filename: string): Promise<string> {
    // создаем ключ кэша используя хэш имени и хэш содержимого
    // @todo учитывать mtimeMs, size файла tsconfig.json
    const { mtimeMs, size } = await fs.stat(filename);
    const cacheKey = createHash('md5').update(`${filename}-${mtimeMs}-${size}`).digest('hex');

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
