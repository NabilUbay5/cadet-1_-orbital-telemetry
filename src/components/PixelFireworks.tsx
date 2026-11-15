/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

const bursts = [
  { id: 'cyan-left', left: '8%', top: '28%', color: '#00F0FF', delay: '1.1s' },
  { id: 'amber-right', left: '92%', top: '30%', color: '#FFB000', delay: '1.9s' },
  { id: 'green-left', left: '8%', top: '74%', color: '#00FF66', delay: '2.7s' },
] as const;

const sparkDirections = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'] as const;

export function PixelFireworks() {
  return (
    <div aria-hidden="true" className="pixel-fireworks absolute inset-0 z-20 overflow-hidden pointer-events-none">
      {bursts.map((burst) => (
        <div
          key={burst.id}
          className="pixel-firework-burst"
          style={{ left: burst.left, top: burst.top }}
        >
          {sparkDirections.map((direction) => (
            <span
              key={direction}
              className={`pixel-firework-spark pixel-firework-spark--${direction}`}
              style={{ backgroundColor: burst.color, animationDelay: burst.delay }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
