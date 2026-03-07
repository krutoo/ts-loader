import { describe, test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { HomePage } from '.';

describe('HomePage', () => {
  test('should renders correctly', ({ assert }) => {
    assert.snapshot(renderToStaticMarkup(<HomePage />));
  });
});
