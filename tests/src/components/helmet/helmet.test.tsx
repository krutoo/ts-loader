import { describe, test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Helmet } from '.';

describe('Helmet', () => {
  test('should renders correctly', ({ assert }) => {
    assert.snapshot(renderToStaticMarkup(<Helmet>Hello, world!</Helmet>));
  });
});
