import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Helmet } from '#components/helmet';

export function renderPageToString(markup: ReactNode) {
  return `<!doctype html>${renderToStaticMarkup(<Helmet>{markup}</Helmet>)}`;
}
