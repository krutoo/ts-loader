import type typescript from 'typescript';

const cache = {
  typescript: null as typeof typescript | null,
};

export async function getTypeScript(): Promise<typeof typescript> {
  if (!cache.typescript) {
    const mod = await import('typescript');

    cache.typescript = mod.default;
  }

  return cache.typescript;
}
