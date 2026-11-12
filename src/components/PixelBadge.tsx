/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MissionStage } from '../types/game.ts';

interface PixelBadgeProps {
  stage: MissionStage;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PixelBadge: React.FC<PixelBadgeProps> = ({
  stage,
  size = 'md',
  className = '',
}) => {
  const dimension = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-24 h-24' : 'w-16 h-16';

  return (
    <div className={`inline-block ${dimension} ${className} shrink-0`}>
      <svg
        viewBox="0 0 64 64"
        className="w-full h-full drop-shadow-[2px_2px_0px_#000]"
        style={{ shapeRendering: 'crispEdges' }}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {stage === 1 && (
          // STAGE 1: GRAVITY & VECTOR SPECIALIST BADGE (CYAN / PLANET & ORBIT)
          <g>
            {/* Outer Badge Shield Frame */}
            <rect x="8" y="4" width="48" height="56" fill="#0d111a" stroke="#00F0FF" strokeWidth="2" />
            <rect x="12" y="8" width="40" height="48" fill="#141c2c" />
            {/* Corner Notch Accents */}
            <rect x="8" y="4" width="4" height="4" fill="#00F0FF" />
            <rect x="52" y="4" width="4" height="4" fill="#00F0FF" />
            <rect x="8" y="56" width="4" height="4" fill="#00F0FF" />
            <rect x="52" y="56" width="4" height="4" fill="#00F0FF" />

            {/* Orbit Ellipse Ring */}
            <rect x="16" y="28" width="32" height="4" fill="#FFB000" />
            <rect x="12" y="30" width="4" height="4" fill="#FFB000" />
            <rect x="48" y="26" width="4" height="4" fill="#FFB000" />

            {/* Central Planet Sphere (8-Bit Stepped) */}
            <rect x="26" y="20" width="12" height="20" fill="#00F0FF" />
            <rect x="22" y="24" width="20" height="12" fill="#00F0FF" />
            {/* Planet Texture Bands */}
            <rect x="24" y="26" width="16" height="4" fill="#0d111a" />
            <rect x="26" y="32" width="12" height="4" fill="#141c2c" />

            {/* Vector Chevron Arrow at Bottom */}
            <polygon points="32,44 40,50 36,50 32,47 28,50 24,50" fill="#00F0FF" />

            {/* Top Star */}
            <rect x="30" y="10" width="4" height="4" fill="#FFB000" />
            <rect x="31" y="9" width="2" height="6" fill="#FFFFFF" />
            <rect x="29" y="11" width="6" height="2" fill="#FFFFFF" />
          </g>
        )}

        {stage === 2 && (
          // STAGE 2: ORBITAL ENTRY AVIATOR BADGE (AMBER / HEAT SHIELD & ENERGY CUBE)
          <g>
            {/* Outer Badge Shield Frame */}
            <rect x="8" y="4" width="48" height="56" fill="#0d111a" stroke="#FFB000" strokeWidth="2" />
            <rect x="12" y="8" width="40" height="48" fill="#241a12" />
            {/* Corner Notch Accents */}
            <rect x="8" y="4" width="4" height="4" fill="#FFB000" />
            <rect x="52" y="4" width="4" height="4" fill="#FFB000" />
            <rect x="8" y="56" width="4" height="4" fill="#FFB000" />
            <rect x="52" y="56" width="4" height="4" fill="#FFB000" />

            {/* Atmospheric Re-Entry Flame Grid */}
            <rect x="16" y="14" width="6" height="2" fill="#FF3344" />
            <rect x="42" y="14" width="6" height="2" fill="#FF3344" />
            <rect x="14" y="18" width="6" height="2" fill="#FF7700" />
            <rect x="44" y="18" width="6" height="2" fill="#FF7700" />
            <rect x="12" y="22" width="6" height="2" fill="#FFB000" />
            <rect x="46" y="22" width="6" height="2" fill="#FFB000" />

            {/* Isometric Glowing Energy Cube in Center */}
            <polygon points="32,20 44,26 32,32 20,26" fill="#00F0FF" />
            <polygon points="20,26 32,32 32,44 20,38" fill="#0088AA" />
            <polygon points="44,26 32,32 32,44 44,38" fill="#00BBDD" />
            {/* Cube Inner Glow */}
            <rect x="30" y="29" width="4" height="6" fill="#FFFFFF" />

            {/* Aviator Wing Chevrons at Bottom */}
            <rect x="16" y="46" width="12" height="3" fill="#FFB000" />
            <rect x="36" y="46" width="12" height="3" fill="#FFB000" />
            <rect x="20" y="50" width="8" height="3" fill="#FF7700" />
            <rect x="36" y="50" width="8" height="3" fill="#FF7700" />
            <rect x="30" y="46" width="4" height="7" fill="#FFFFFF" />
          </g>
        )}

        {stage === 3 && (
          // STAGE 3: DEEP SPACE NAVIGATOR BADGE (EMERALD / SATELLITE & RADIO TELEMETRY)
          <g>
            {/* Outer Badge Shield Frame */}
            <rect x="8" y="4" width="48" height="56" fill="#0d111a" stroke="#00FF66" strokeWidth="2" />
            <rect x="12" y="8" width="40" height="48" fill="#102418" />
            {/* Corner Notch Accents */}
            <rect x="8" y="4" width="4" height="4" fill="#00FF66" />
            <rect x="52" y="4" width="4" height="4" fill="#00FF66" />
            <rect x="8" y="56" width="4" height="4" fill="#00FF66" />
            <rect x="52" y="56" width="4" height="4" fill="#00FF66" />

            {/* Satellite Solar Wings */}
            <rect x="14" y="26" width="12" height="8" fill="#00F0FF" stroke="#050508" strokeWidth="1" />
            <rect x="18" y="26" width="4" height="8" fill="#0088AA" />
            <rect x="38" y="26" width="12" height="8" fill="#00F0FF" stroke="#050508" strokeWidth="1" />
            <rect x="42" y="26" width="4" height="8" fill="#0088AA" />

            {/* Satellite Main Body */}
            <rect x="28" y="24" width="8" height="12" fill="#00FF66" />
            <rect x="30" y="26" width="4" height="8" fill="#050508" />

            {/* Telemetry Antenna Dish & Mast */}
            <line x1="32" y1="24" x2="32" y2="16" stroke="#00FF66" strokeWidth="2" />
            <rect x="28" y="16" width="8" height="3" fill="#FFB000" />

            {/* Radio Telemetry Waves (3 Stepped Rings) */}
            <path d="M26 12 Q32 8 38 12" stroke="#00FF66" strokeWidth="2" fill="none" />
            <path d="M22 8 Q32 2 42 8" stroke="#00FF66" strokeWidth="1" strokeDasharray="2,2" fill="none" />

            {/* Navigational Constellation Stars at Bottom */}
            <rect x="20" y="48" width="3" height="3" fill="#FFB000" />
            <rect x="31" y="44" width="3" height="3" fill="#FFFFFF" />
            <rect x="42" y="49" width="3" height="3" fill="#00F0FF" />
            <line x1="21" y1="49" x2="32" y2="45" stroke="#2A3B5C" strokeWidth="1" />
            <line x1="32" y1="45" x2="43" y2="50" stroke="#2A3B5C" strokeWidth="1" />
          </g>
        )}
      </svg>
    </div>
  );
};
