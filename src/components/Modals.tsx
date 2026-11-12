/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MissionResult } from '../types/game.ts';
import { PixelBadge } from './PixelBadge.tsx';

const confettiColors = ['#00F0FF', '#00FF66', '#FFB000', '#FFFFFF'];
const pixelConfetti = Array.from({ length: 48 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  color: confettiColors[index % confettiColors.length],
  size: index % 5 === 0 ? 8 : 5,
  duration: `${2.8 + (index % 7) * 0.3}s`,
  delay: `${-((index * 13) % 35) / 10}s`,
}));

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({ onResume, onRestart, onExit }) => {
  return (
    <div className="absolute inset-0 bg-[#050508]/85 flex items-center justify-center p-4 z-30 pointer-events-auto font-pixel">
      <div className="w-full max-w-md retro-window p-6 bg-[#0d111a] border-2 border-[#00F0FF] shadow-[4px_4px_0_#000]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#2A3B5C] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#00F0FF] inline-block animate-pulse" />
            <span className="text-xs text-[#00F0FF] uppercase tracking-wider">
              ★ GAME PAUSED ★
            </span>
          </div>
          <span className="text-[9px] text-[#64748B]">[ESC]</span>
        </div>

        {/* 8-Bit Controls Keymap */}
        <div className="border border-[#2A3B5C] bg-[#050508] p-3 text-[9px] mb-5 space-y-2 leading-relaxed">
          <div className="text-[9px] text-[#FFB000] border-b border-[#2A3B5C] pb-1.5 uppercase">
            CONTROLS REFERENCE
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B]">THRUST / BRAKE:</span>
            <span className="text-[#FFFFFF]">W / S</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B]">YAW STEER:</span>
            <span className="text-[#FFFFFF]">A / D</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B]">PITCH ELEVATION:</span>
            <span className="text-[#FFFFFF]">R / F</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B]">ROLL BANK:</span>
            <span className="text-[#FFFFFF]">Q / E</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B]">BOOST:</span>
            <span className="text-[#FFB000]">SHIFT</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B]">RADAR SCAN:</span>
            <span className="text-[#00F0FF]">SPACE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B]">CAMERA:</span>
            <span className="text-[#FFFFFF]">C</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onResume}
            className="retro-btn flex-1 h-11 px-2 text-[9px] tracking-wider flex items-center justify-center cursor-pointer"
          >
            CONTINUE [ESC]
          </button>
          <button
            onClick={onRestart}
            className="retro-btn-secondary flex-1 h-11 px-2 text-[9px] text-[#FF3344] hover:text-[#FFFFFF] cursor-pointer"
          >
            RESTART
          </button>
        </div>
        <button
          onClick={onExit}
          className="retro-btn-secondary w-full h-10 mt-3 text-[9px] text-[#A0AEC0] hover:text-[#00F0FF] cursor-pointer"
        >
          EXIT TO LOBBY
        </button>
      </div>
    </div>
  );
};

interface VictoryModalProps {
  result: MissionResult;
  onRestart: () => void;
  onExit: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ result, onRestart, onExit }) => {
  return (
    <div className="absolute inset-0 bg-[#050508]/92 flex items-center justify-center p-4 z-30 pointer-events-auto font-pixel">
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
      <div className="relative z-10 w-full max-w-lg retro-window-green p-6 bg-[#0d111a] border-2 border-[#00FF66] shadow-[6px_6px_0_#000]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#2A3B5C] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#00FF66] inline-block animate-pulse" />
            <span className="text-xs text-[#00FF66] uppercase tracking-wider">
              ★ GRADUATION DIPLOMA: JUNIOR ASTRONAUT ★
            </span>
          </div>
          <span className="text-[9px] text-[#FFB000]">TRAINING VERIFIED</span>
        </div>

        {/* Qualification Honors */}
        <div className="border border-[#2A3B5C] bg-[#050508] p-4 text-center mb-4">
          <div className="text-[9px] text-[#64748B] mb-2 uppercase">OFFICIAL RANK CONFERRED</div>
          <div className="text-sm md:text-base text-[#FFFFFF] tracking-wider mb-2 font-bold">
            {result.cadetRank}
          </div>
          <div className="text-[9px] text-[#00FF66]">
            ACADEMIC SCORE: 100% · ALL 3 CERTIFICATION EXAMS PASSED
          </div>
        </div>

        {/* 3 Pixel Art Conferred Badges */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="border border-[#00F0FF] bg-[#050508] p-2 flex flex-col items-center">
            <PixelBadge stage={1} size="md" className="mb-1" />
            <div className="text-[8px] text-[#00F0FF] font-bold">STAGE 1</div>
            <div className="text-[7px] text-[#A0AEC0] mt-0.5">GRAVITY BASIC</div>
          </div>
          <div className="border border-[#FFB000] bg-[#050508] p-2 flex flex-col items-center">
            <PixelBadge stage={2} size="md" className="mb-1" />
            <div className="text-[8px] text-[#FFB000] font-bold">STAGE 2</div>
            <div className="text-[7px] text-[#A0AEC0] mt-0.5">ORBITAL ENTRY</div>
          </div>
          <div className="border border-[#00FF66] bg-[#050508] p-2 flex flex-col items-center">
            <PixelBadge stage={3} size="md" className="mb-1" />
            <div className="text-[8px] text-[#00FF66] font-bold">STAGE 3</div>
            <div className="text-[7px] text-[#A0AEC0] mt-0.5">DEEP SPACE</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-[9px] border border-[#2A3B5C] bg-[#050508] p-3 mb-5 leading-loose">
          <div className="border-r border-[#2A3B5C] pr-2">
            <span className="text-[#64748B]">MISSION TIME:</span>
            <div className="text-xs text-[#FFFFFF] font-bold mt-0.5">{result.flightTimeFormatted}</div>
          </div>
          <div className="pl-2">
            <span className="text-[#64748B]">ENERGY HARVEST:</span>
            <div className="text-xs text-[#00F0FF] font-bold mt-0.5">{result.energyCubesCollected} / 3 CUBES</div>
          </div>
          <div className="border-r border-t border-[#2A3B5C] pr-2 pt-2 mt-1">
            <span className="text-[#64748B]">BADGES EARNED:</span>
            <div className="text-xs text-[#FFB000] font-bold mt-0.5">3 / 3 BADGES</div>
          </div>
          <div className="border-t border-[#2A3B5C] pl-2 pt-2 mt-1">
            <span className="text-[#64748B]">HULL DAMAGE:</span>
            <div
              className={`text-xs font-bold mt-0.5 ${
                result.hullDamageTaken === 0 ? 'text-[#00FF66]' : 'text-[#FFB000]'
              }`}
            >
              {result.hullDamageTaken}%
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRestart}
            className="retro-btn flex-1 h-12 text-[10px] md:text-xs tracking-wider flex items-center justify-center cursor-pointer"
          >
            NEXT CYCLE [R]
          </button>
          <button
            onClick={onExit}
            className="retro-btn-secondary h-12 px-4 text-[9px] text-[#A0AEC0] hover:text-[#00FF66] cursor-pointer"
          >
            EXIT TO LOBBY
          </button>
        </div>
      </div>
    </div>
  );
};

interface DefeatModalProps {
  result: MissionResult;
  onRestart: () => void;
  onExit: () => void;
}

export const DefeatModal: React.FC<DefeatModalProps> = ({ result, onRestart, onExit }) => {
  return (
    <div className="absolute inset-0 bg-[#050508]/90 flex items-center justify-center p-4 z-30 pointer-events-auto font-pixel">
      <div className="w-full max-w-lg retro-window-red p-6 bg-[#0d111a] border-2 border-[#FF3344] shadow-[4px_4px_0_#000]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#2A3B5C] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#FF3344] inline-block animate-arcade-blink" />
            <span className="text-xs text-[#FF3344] uppercase tracking-wider">
              ★ GAME OVER ★
            </span>
          </div>
          <span className="text-[9px] text-[#FF3344]">[ABORT]</span>
        </div>

        {/* Cause */}
        <div className="border border-[#FF3344]/50 bg-[#FF3344]/10 p-3 mb-4 text-[9px] text-[#ffdad6] leading-relaxed">
          <div className="text-[#FF3344] mb-1 font-bold">TERMINATION LOG:</div>
          <div>{result.reason}</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-[9px] border border-[#2A3B5C] bg-[#050508] p-3 mb-5 leading-loose">
          <div className="border-r border-[#2A3B5C] pr-2">
            <span className="text-[#64748B]">TIME:</span>
            <div className="text-xs text-[#FFFFFF] mt-1">{result.flightTimeFormatted}</div>
          </div>
          <div className="pl-2">
            <span className="text-[#64748B]">BADGES:</span>
            <div className="text-xs text-[#FFB000] mt-1">{result.badgesEarned} / 3</div>
          </div>
          <div className="border-r border-t border-[#2A3B5C] pr-2 pt-2 mt-1">
            <span className="text-[#64748B]">CUBES:</span>
            <div className="text-xs text-[#00F0FF] mt-1">{result.energyCubesCollected} / 3</div>
          </div>
          <div className="border-t border-[#2A3B5C] pl-2 pt-2 mt-1">
            <span className="text-[#64748B]">DAMAGE:</span>
            <div className="text-xs text-[#FF3344] mt-1">{result.hullDamageTaken}%</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRestart}
            className="retro-btn flex-1 h-12 text-[10px] md:text-xs tracking-wider flex items-center justify-center cursor-pointer border-[#FF3344] bg-[#FF3344] text-[#050508] hover:bg-[#050508] hover:text-[#FF3344]"
          >
            RETRY SIMULATION [R]
          </button>
          <button
            onClick={onExit}
            className="retro-btn-secondary h-12 px-4 text-[9px] text-[#A0AEC0] hover:text-[#FF3344] cursor-pointer"
          >
            EXIT TO LOBBY
          </button>
        </div>
      </div>
    </div>
  );
};
