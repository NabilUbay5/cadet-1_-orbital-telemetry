import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'bun:test';
import { PixelFireworks } from '../PixelFireworks.tsx';

describe('PixelFireworks', () => {
  test('renders staggered decorative pixel bursts', () => {
    const markup = renderToStaticMarkup(React.createElement(PixelFireworks));

    expect(markup).toContain('aria-hidden="true"');
    expect(markup.match(/class="pixel-firework-burst"/g)).toHaveLength(3);
    expect(markup.match(/class="pixel-firework-spark /g)).toHaveLength(24);
  });
});
