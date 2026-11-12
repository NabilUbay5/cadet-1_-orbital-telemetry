/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PixelBadge } from './PixelBadge.tsx';

interface TitleScreenProps {
  onStart: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  return (
    <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-8 pointer-events-none z-20 font-pixel">
      {/* Top Arcade Marquee Stamp */}
      <div className="flex items-center justify-between border-b-2 border-[#00F0FF] pb-2.5 pointer-events-auto bg-[#050508]/90 px-4 py-2 shadow-[0_3px_0_#000]">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 bg-[#FFB000] inline-block animate-pulse" />
          <span className="text-[10px] md:text-xs text-[#00F0FF] uppercase tracking-wider">
            ★ JUNIOR ASTRONAUT MISSION TRAINER // 8-BIT ARCADE SIM ★
          </span>
        </div>
        <div className="flex items-center gap-4 text-[9px] md:text-[10px] text-[#A0AEC0]">
          <span>HI-SCORE <span className="text-[#FFB000]">99990</span></span>
          <span className="text-[#2A3B5C]">|</span>
          <span className="text-[#00FF66]">CREDIT 01</span>
        </div>
      </div>

      {/* Center 8-Bit Title Lockup & Mission Dossier */}
      <div className="max-w-2xl my-auto pointer-events-auto">
        {/* Pixel Title Banner */}
        <div className="retro-window p-5 md:p-6 mb-4 border-2 border-[#00F0FF] bg-[#0d111a]/95">
          <div className="flex items-center gap-2 mb-2 text-[9px] text-[#FFB000]">
            <span>▶ FLIGHT ACADEMY: CADET-1</span>
            <span className="text-[#2A3B5C]">·</span>
            <span>ORBITAL RECON // SECTOR 7</span>
          </div>

          <h1 className="text-xl md:text-3xl text-[#FFFFFF] tracking-wider leading-relaxed mb-2">
            JUNIOR ASTRONAUT
          </h1>
          <div className="text-xs md:text-sm text-[#00F0FF] tracking-widest uppercase mb-4">
            [ MISSION TRAINER & CERTIFICATION ]
          </div>

          <div className="h-0.5 w-full bg-[#00F0FF] mb-4" />

          {/* 3-Stage Progression Roadmap */}
          <div className="space-y-2 mb-5">
            <div className="border border-[#2A3B5C] bg-[#050508] p-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <PixelBadge stage={1} size="sm" />
                <div>
                  <div className="text-[9px] text-[#00F0FF] font-bold">STAGE 1: GROUND SCHOOL & GRAVITY BASICS</div>
                  <div className="text-[8px] text-[#A0AEC0]">Task: Counter gravitational turbulence & stabilize flight gyros.</div>
                </div>
              </div>
              <span className="text-[8px] text-[#FFB000] shrink-0">[QUIZ GATE 1]</span>
            </div>

            <div className="border border-[#2A3B5C] bg-[#050508] p-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <PixelBadge stage={2} size="sm" />
                <div>
                  <div className="text-[9px] text-[#FFB000] font-bold">STAGE 2: ATMOSPHERE & ORBITAL ENTRY</div>
                  <div className="text-[8px] text-[#A0AEC0]">Task: Collect 3 glowing Energy Cubes while dodging debris hazards.</div>
                </div>
              </div>
              <span className="text-[8px] text-[#FFB000] shrink-0">[QUIZ GATE 2]</span>
            </div>

            <div className="border border-[#2A3B5C] bg-[#050508] p-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <PixelBadge stage={3} size="sm" />
                <div>
                  <div className="text-[9px] text-[#00FF66] font-bold">STAGE 3: DEEP SPACE NAVIGATION</div>
                  <div className="text-[8px] text-[#A0AEC0]">Task: Align telemetry coordinates with the Deep Space Satellite.</div>
                </div>
              </div>
              <span className="text-[8px] text-[#FFB000] shrink-0">[QUIZ GATE 3]</span>
            </div>
          </div>

          {/* Primary Arcade Start CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button
              onClick={onStart}
              className="retro-btn h-12 px-6 text-xs md:text-sm tracking-wider flex items-center justify-center gap-3 cursor-pointer"
            >
              <span>PRESS START</span>
              <span className="text-[10px] opacity-80">[ENTER / SPACE]</span>
            </button>

            <div className="text-[10px] text-[#FFB000] animate-arcade-blink text-center sm:text-left">
              ★ 1 PLAYER READY · INSERT COIN ★
            </div>
          </div>
        </div>
      </div>

      {/* Flat Single Control Hint Line in 8-Bit Pixel Typography */}
      <div className="border-t-2 border-[#2A3B5C] pt-3 pb-1 flex flex-col md:flex-row items-center justify-between text-[9px] text-[#A0AEC0] pointer-events-auto bg-[#050508]/90 px-4 shadow-[0_-3px_0_#000]">
        <div className="leading-normal">
          <span className="text-[#00F0FF]">W/S</span> THROTTLE · <span className="text-[#00F0FF]">A/D</span> YAW · <span className="text-[#00F0FF]">R/F</span> PITCH · <span className="text-[#00F0FF]">Q/E</span> ROLL · <span className="text-[#FFB000]">SHIFT</span> BOOST · <span className="text-[#00FF66]">SPACE</span> SCAN · <span className="text-[#FFFFFF]">C</span> CAM · <span className="text-[#FF3344]">ESC</span> PAUSE
        </div>
        <div className="text-[#64748B] mt-1 md:mt-0">
          © 1989 CADET-1 ARCADE LABS
        </div>
      </div>
    </div>
  );
};
