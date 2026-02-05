import type ts from 'typescript';
import { once } from './shared/once.ts';

/**
 * TypeScript is used as lazy dependency because it's size is over 10mb.
 * It is slow to statically import it in each file because it may not be needed.
 */
export const getTypeScript: () => Promise<typeof ts> = once(async () => {
  return await import('typescript').then(mod => mod.default);
});
