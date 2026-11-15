/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

const confettiColors = ['#00F0FF', '#00FF66', '#FFB000', '#FFFFFF'];
const pixelConfetti = Array.from({ length: 48 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  color: confettiColors[index % confettiColors.length],
  size: index % 5 === 0 ? 8 : 5,
  duration: `${2.8 + (index % 7) * 0.3}s`,
  delay: `${-((index * 13) % 35) / 10}s`,
}));

export function PixelConfetti() {
  return (
    <div aria-hidden="true" className="pixel-confetti absolute inset-0 overflow-hidden pointer-events-none">
      {pixelConfetti.map((piece, index) => (
        <span
          key={index}
          className="pixel-confetti-piece"
          style={{
            left: piece.left,
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            animationDuration: piece.duration,
            animationDelay: piece.delay,
          }}
        />
      ))}
    </div>
  );
}
