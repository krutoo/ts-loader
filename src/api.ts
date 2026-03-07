import type { Api } from './types.ts';

export function createHttpApi({ baseUrl }: { baseUrl: string }): Api {
  return {
    async resolve({ specifier, parentUrl }) {
      const apiUrl = new URL(`/resolve`, baseUrl);

      apiUrl.searchParams.set('specifier', specifier);

      if (parentUrl) {
        apiUrl.searchParams.set('parentUrl', parentUrl);
      }

      const res = await fetch(apiUrl);

      return res.ok ? await res.text() : null;
    },

    async transpile({ fileUrl }) {
      const apiUrl = new URL(`/transpile`, baseUrl);

      apiUrl.searchParams.set('fileUrl', fileUrl);

      const res = await fetch(apiUrl);

      return res.ok ? await res.text() : null;
    },
  };
}
