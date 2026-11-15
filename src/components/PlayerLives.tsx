/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';

/** 8-bit heart drawn on a 7x6 pixel grid, so it stays crisp at any size. */
const HEART_ROWS = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];

const PixelHeart: React.FC<{ state: 'full' | 'breaking' | 'empty' }> = ({ state }) => (
  <svg
    viewBox="0 0 7 6"
    width="21"
    height="18"
    shapeRendering="crispEdges"
    aria-hidden="true"
    className={`pixel-heart pixel-heart-${state}`}
  >
    {HEART_ROWS.flatMap((row, y) =>
      [...row].map((cell, x) => (cell === '1' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null))
    )}
  </svg>
);

interface PlayerLivesProps {
  lives: number;
  maxLives: number;
  invulnerable: boolean;
}

/** Heart bar for the flight HUD. A lost heart shakes and breaks before it empties. */
export const PlayerLives: React.FC<PlayerLivesProps> = ({ lives, maxLives, invulnerable }) => {
  const previous = useRef(lives);
  const [breaking, setBreaking] = useState<number | null>(null);

  useEffect(() => {
    if (lives < previous.current) {
      setBreaking(lives); // index of the heart that was just lost
      const timer = window.setTimeout(() => setBreaking(null), 600);
      previous.current = lives;
      return () => window.clearTimeout(timer);
    }
    previous.current = lives;
    setBreaking(null);
  }, [lives]);

  return (
    <div
      role="img"
      aria-label={`Lives: ${lives} of ${maxLives}${invulnerable ? ', shield flashing' : ''}`}
      data-testid="player-lives"
      className="flex items-center justify-between pt-1"
    >
      <span className="text-[9px] text-[#A0AEC0]">LIVES</span>
      <span className={`flex items-center gap-1.5 ${invulnerable ? 'pixel-hearts-hit' : ''}`}>
        {Array.from({ length: maxLives }, (_, i) => (
          <PixelHeart key={i} state={i === breaking ? 'breaking' : i < lives ? 'full' : 'empty'} />
        ))}
      </span>
    </div>
  );
};
