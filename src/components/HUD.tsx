/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { soundManager } from '../audio/soundManager.ts';
import { TelemetryData } from '../types/game.ts';
import { PixelBadge } from './PixelBadge.tsx';

interface HUDProps {
  telemetry: TelemetryData;
  onCycleCamera: () => void;
  onToggleFlightAssist: () => void;
  onToggleMute: () => void;
  onTriggerPulse: () => void;
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  onCycleCamera,
  onToggleFlightAssist,
  onToggleMute,
  onTriggerPulse,
  onPause,
}) => {
  const [showAnnouncement, setShowAnnouncement] = useState<boolean>(true);
  const prevStageRef = useRef<number>(telemetry.stage);
  const prevTaskCompleteRef = useRef<boolean>(telemetry.stageTaskComplete);

  // Trigger popup & chiptune radio chirp whenever stage changes or task completes
  useEffect(() => {
    if (telemetry.stage !== prevStageRef.current) {
      prevStageRef.current = telemetry.stage;
      setShowAnnouncement(true);
      soundManager.playRadioDispatch();
    }
  }, [telemetry.stage]);

  useEffect(() => {
    if (telemetry.stageTaskComplete && !prevTaskCompleteRef.current) {
      prevTaskCompleteRef.current = true;
      setShowAnnouncement(true);
      soundManager.playRadioDispatch();
    } else if (!telemetry.stageTaskComplete) {
      prevTaskCompleteRef.current = false;
    }
  }, [telemetry.stageTaskComplete]);

  const mins = Math.floor(telemetry.metSeconds / 60);
  const secs = (telemetry.metSeconds % 60).toFixed(1);
  const metFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(4, '0')}`;

  const renderPixelBar = (value: number, totalBlocks: number = 10, isWarning: boolean = false) => {
    const activeBlocks = Math.round((value / 100) * totalBlocks);
    return (
      <div className="flex gap-[2px] h-3 w-full bg-[#050508] p-[1px] border border-[#2A3B5C]">
        {Array.from({ length: totalBlocks }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-full ${
              i < activeBlocks
                ? isWarning
                  ? 'bg-[#FFB000]'
                  : value < 25
                  ? 'bg-[#FF3344]'
                  : 'bg-[#00F0FF]'
                : 'bg-[#141926]'
            }`}
          />
        ))}
      </div>
    );
  };

  // Detailed stage mission instructions
  const stageDirectives: Record<number, { title: string; subtitle: string; directive: string }> = {
    1: {
      title: 'STAGE 1: GROUND SCHOOL & GRAVITY BASICS',
      subtitle: 'FLIGHT CALIBRATION PROTOCOL',
      directive:
        'Counter gravitational turbulence using pitch & yaw controls (W/S/A/D or Arrows). Hold the crosshair level within ±4.5° for 4 seconds to calibrate flight gyros.',
    },
    2: {
      title: 'STAGE 2: ATMOSPHERE & ORBITAL ENTRY',
      subtitle: 'ENERGY HARVEST & DEBRIS AVOIDANCE',
      directive:
        'Navigate the orbital entry corridor and collect 3 glowing Energy Cubes scattered in the asteroid belt. Avoid high-velocity debris collisions.',
    },
    3: {
      title: 'STAGE 3: DEEP SPACE NAVIGATION',
      subtitle: 'SATELLITE TELEMETRY ALIGNMENT',
      directive:
        'Locate the Deep Space Satellite Relay. Approach within 45m and maintain targeting crosshair alignment (error < 8°) for 3 seconds to upload orbital coordinates.',
    },
  };

  const currentDirective = stageDirectives[telemetry.stage] || stageDirectives[1];

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between overflow-hidden font-pixel">
      {/* 1. TOP COMMAND DECK (Height 48px, 100% width) */}
      <header className="w-full h-12 bg-[#0d111a]/95 border-b-2 border-[#00F0FF] px-3 md:px-4 flex items-center justify-between pointer-events-auto shadow-[0_3px_0_#000]">
        {/* Left: MET & Stage Name */}
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#00FF66] inline-block animate-pulse" />
            <span className="text-[9px] text-[#A0AEC0]">MET</span>
            <span className="text-xs md:text-sm font-bold text-[#FFFFFF]">
              {metFormatted}
            </span>
          </div>

          <div className="h-4 w-0.5 bg-[#2A3B5C]" />

          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[#FFB000]">STAGE:</span>
            <span className="text-xs md:text-sm text-[#00F0FF]">
              {telemetry.stageTitle}
            </span>
          </div>
        </div>

        {/* Center: Unlocked Badges Trophy Shelf */}
        <div className="hidden lg:flex items-center gap-2 border border-[#2A3B5C] bg-[#050508] px-3 py-1">
          <span className="text-[8px] text-[#A0AEC0] mr-1">BADGES:</span>
          {[
            { id: 'badge-gravity', stage: 1, label: 'GRAV' },
            { id: 'badge-orbital', stage: 2, label: 'ORBIT' },
            { id: 'badge-deepspace', stage: 3, label: 'NAV' },
          ].map((b) => {
            const isEarned = telemetry.badgesUnlocked.includes(b.id);
            return (
              <div
                key={b.id}
                className={`px-2 py-0.5 text-[8px] border ${
                  isEarned
                    ? 'border-[#00FF66] bg-[#00FF66]/20 text-[#00FF66] font-bold'
                    : 'border-[#2A3B5C] bg-[#141926] text-[#64748B]'
                }`}
              >
                {isEarned ? `★ ${b.label}` : `[ ${b.label} ]`}
              </div>
            );
          })}
        </div>

        {/* Right: Dispatch Toggle, Readiness & Pause */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowAnnouncement((prev) => !prev);
              if (!showAnnouncement) soundManager.playRadioDispatch();
            }}
            className={`h-8 px-2.5 text-[9px] border flex items-center gap-1 cursor-pointer transition-none ${
              showAnnouncement
                ? 'border-[#00F0FF] bg-[#00F0FF] text-[#050508] font-bold'
                : 'border-[#FFB000] bg-[#0d111a] text-[#FFB000] hover:bg-[#FFB000] hover:text-[#050508]'
            }`}
            title="Toggle Mission Announcement [M]"
          >
            <span>▶ DISPATCH</span>
            {!showAnnouncement && <span className="w-1.5 h-1.5 bg-[#FFB000] inline-block animate-ping" />}
          </button>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[9px] text-[#A0AEC0]">READY</span>
            <span className="text-xs md:text-sm text-[#00FF66]">
              {telemetry.missionReadiness}%
            </span>
          </div>

          <button
            onClick={onPause}
            className="retro-btn-secondary h-8 px-2.5 text-[9px] flex items-center gap-1 cursor-pointer"
          >
            <span>PAUSE</span>
            <span className="text-[8px] text-[#64748B]">[ESC]</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* ★ MISSION ANNOUNCEMENT POPUP IN THE TOP RIGHT CORNER ★ */}
      {/* ========================================================================= */}
      <div className="absolute top-14 right-4 z-40 max-w-[340px] md:max-w-[380px] pointer-events-auto">
        {showAnnouncement ? (
          <div className="retro-window p-3.5 bg-[#0d111a]/98 border-2 border-[#00F0FF] shadow-[5px_5px_0_#000] animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Announcement Top Header */}
            <div className="flex items-center justify-between border-b-2 border-[#2A3B5C] pb-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#FFB000] inline-block animate-pulse" />
                <span className="text-[9px] text-[#00F0FF] uppercase tracking-wider font-bold">
                  ★ MISSION DISPATCH ★
                </span>
              </div>
              <button
                onClick={() => setShowAnnouncement(false)}
                className="text-[9px] text-[#64748B] hover:text-[#FF3344] px-1 border border-transparent hover:border-[#FF3344] cursor-pointer"
                title="Dismiss Announcement"
              >
                [X]
              </button>
            </div>

            {/* Stage Title & Subtitle */}
            <div className="text-[9px] text-[#FFB000] uppercase font-bold mb-1">
              {currentDirective.title}
            </div>
            <div className="text-[8px] text-[#A0AEC0] mb-2 uppercase">
              {currentDirective.subtitle}
            </div>

            {/* Primary Directive Copy */}
            <div className="border border-[#2A3B5C] bg-[#050508] p-2.5 mb-2.5 text-[9px] leading-relaxed text-[#FFFFFF]">
              {currentDirective.directive}
            </div>

            {/* Stage Completion Alert Banner */}
            {telemetry.stageTaskComplete ? (
              <div className="border-2 border-[#00FF66] bg-[#00FF66]/20 p-2 text-center text-[9px] text-[#00FF66] font-bold animate-arcade-blink">
                ★ TASK COMPLETED! EXAM INITIALIZED ★
              </div>
            ) : (
              <div className="flex items-center justify-between text-[8px] text-[#64748B]">
                <span>STATUS: IN PROGRESS</span>
                <span className="text-[#00F0FF]">
                  {telemetry.stage === 1
                    ? `CALIBRATION: ${telemetry.stageTaskProgress}%`
                    : telemetry.stage === 2
                    ? `CUBES: ${telemetry.energyCubesCollected}/3`
                    : `LOCK: ${telemetry.satelliteLockProgress}%`}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Minimized Top-Right Corner Button */
          <button
            onClick={() => {
              setShowAnnouncement(true);
              soundManager.playRadioDispatch();
            }}
            className="retro-btn-secondary px-3 py-1.5 text-[9px] text-[#00F0FF] border-2 border-[#00F0FF] bg-[#0d111a] shadow-[3px_3px_0_#000] flex items-center gap-2 cursor-pointer hover:bg-[#00F0FF] hover:text-[#050508]"
          >
            <span className="w-1.5 h-1.5 bg-[#FFB000] inline-block animate-ping" />
            <span>▶ MISSION BRIEF</span>
          </button>
        )}
      </div>

      {/* 2. MAIN COCKPIT VIEWPORT AREA */}
      <div className="flex-1 relative flex items-center justify-between px-4 md:px-6 pointer-events-none">
        {/* LEFT WING TELEMETRY (Width 280px) */}
        <aside className="w-[260px] md:w-[280px] flex flex-col gap-3 pointer-events-auto">
          {/* Life Support & Hull Integrity Panel */}
          <div className="retro-window p-3 flex flex-col gap-2.5 bg-[#0d111a]/90">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-[#A0AEC0]">O2 RESERVES</span>
              <span
                className={`text-[10px] ${
                  telemetry.oxygen < 25 ? 'text-[#FFB000]' : 'text-[#00FF66]'
                }`}
              >
                {telemetry.oxygen}%
              </span>
            </div>
            {renderPixelBar(telemetry.oxygen, 10, telemetry.oxygen < 25)}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[9px] text-[#A0AEC0]">HULL INTEGRITY</span>
              <span
                className={`text-[10px] ${
                  telemetry.hullIntegrity < 30 ? 'text-[#FF3344]' : 'text-[#FFFFFF]'
                }`}
              >
                {telemetry.hullIntegrity}%
              </span>
            </div>
            {renderPixelBar(telemetry.hullIntegrity, 10, telemetry.hullIntegrity < 30)}
          </div>

          {/* 8-Bit Inertial Stability Reticle */}
          <div className="retro-window p-3 bg-[#0d111a]/90">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] text-[#A0AEC0]">GYRO DRIFT</span>
              <span
                className={`text-[9px] ${
                  telemetry.isInertialDrifting ? 'text-[#FFB000] animate-pulse' : 'text-[#00FF66]'
                }`}
              >
                {telemetry.isInertialDrifting ? '! DRIFT !' : 'LEVEL'}
              </span>
            </div>

            <div className="relative w-full h-24 bg-[#050508] border border-[#2A3B5C] flex items-center justify-center overflow-hidden">
              <div className="absolute w-full h-[1px] bg-[#2A3B5C]" />
              <div className="absolute h-full w-[1px] bg-[#2A3B5C]" />
              <div className="absolute w-12 h-12 border border-[#2A3B5C]/60" />

              <div
                className={`absolute w-2.5 h-2.5 transition-transform duration-75 ${
                  telemetry.isInertialDrifting ? 'bg-[#FFB000]' : 'bg-[#00F0FF]'
                }`}
                style={{
                  transform: `translate(${Math.max(-44, Math.min(44, telemetry.yaw * 1.4))}px, ${Math.max(
                    -36,
                    Math.min(36, telemetry.pitch * 1.4)
                  )}px)`,
                }}
              />

              <div className="absolute bottom-1 left-2 text-[8px] text-[#64748B]">
                P:<span className="text-[#A0AEC0]">{telemetry.pitch}°</span>
              </div>
              <div className="absolute bottom-1 right-2 text-[8px] text-[#64748B]">
                Y:<span className="text-[#A0AEC0]">{telemetry.yaw}°</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 text-[9px]">
              <span className="text-[#64748B]">SPEED</span>
              <span className="text-[#FFFFFF]">{telemetry.velocity.toFixed(0)} M/S</span>
              <span className="text-[#64748B]">G-FORCE</span>
              <span className="text-[#00FF66]">{telemetry.gForce}G</span>
            </div>
          </div>
        </aside>

        {/* CENTER VIEWPORT RETICLE */}
        <div className="relative flex flex-col items-center justify-center">
          {/* Center Pixel Crosshair */}
          <div className="relative w-14 h-14 flex items-center justify-center opacity-85">
            <div className="absolute w-4 h-[2px] bg-[#00F0FF] -top-1" />
            <div className="absolute w-4 h-[2px] bg-[#00F0FF] -bottom-1" />
            <div className="absolute h-4 w-[2px] bg-[#00F0FF] -left-1" />
            <div className="absolute h-4 w-[2px] bg-[#00F0FF] -right-1" />
            <div className="w-1.5 h-1.5 bg-[#00F0FF]" />
          </div>

          {/* Proximity Hazard Alert */}
          {telemetry.hazardWarning && (
            <div className="mt-3 px-3 py-1.5 bg-[#FF3344] text-[#050508] text-[9px] font-bold border border-[#FFFFFF] shadow-[2px_2px_0_#000] animate-arcade-blink">
              ! DEBRIS HAZARD [{telemetry.hazardDistance}M] !
            </div>
          )}
        </div>

        {/* RIGHT WING TELEMETRY (Width 300px) */}
        <aside className="w-[270px] md:w-[300px] flex flex-col gap-3 pointer-events-auto">
          {/* Mission Stage Objectives & Live Task Progress */}
          <div className="retro-window p-3 bg-[#0d111a]/90 text-[9px]">
            <div className="flex items-center justify-between text-[9px] text-[#A0AEC0] mb-2 uppercase">
              <span>MISSION SEQUENCE</span>
              <span className="text-[#00FF66] text-[8px]">PHASE {telemetry.stage} / 3</span>
            </div>
            <div className="space-y-2 mb-3">
              <div
                className={`flex items-center justify-between ${
                  telemetry.stage > 1
                    ? 'text-[#00FF66]'
                    : telemetry.stage === 1
                    ? 'text-[#00F0FF]'
                    : 'text-[#64748B]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{telemetry.stage > 1 ? '[X]' : '[1]'}</span>
                  <span>STAGE 1: GRAVITY BALANCE</span>
                </div>
                {telemetry.stage > 1 && <PixelBadge stage={1} size="sm" />}
              </div>
              <div
                className={`flex items-center justify-between ${
                  telemetry.stage > 2
                    ? 'text-[#00FF66]'
                    : telemetry.stage === 2
                    ? 'text-[#00F0FF]'
                    : 'text-[#64748B]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{telemetry.stage > 2 ? '[X]' : '[2]'}</span>
                  <span>STAGE 2: 3 ENERGY CUBES</span>
                </div>
                {telemetry.stage > 2 && <PixelBadge stage={2} size="sm" />}
              </div>
              <div
                className={`flex items-center justify-between ${
                  telemetry.stage === 3 ? 'text-[#00F0FF]' : 'text-[#64748B]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{telemetry.stageTaskComplete && telemetry.stage === 3 ? '[X]' : '[3]'}</span>
                  <span>STAGE 3: SATELLITE ALIGN</span>
                </div>
                {telemetry.badgesUnlocked.includes('badge-deepspace') && <PixelBadge stage={3} size="sm" />}
              </div>
            </div>

            {/* Stage Progress Gauge in Right Wing */}
            <div className="pt-2 border-t border-[#2A3B5C]/80">
              <div className="text-[8px] text-[#FFB000] mb-1.5 tracking-wider uppercase">
                ▶ {telemetry.stageTaskTitle}
              </div>

              {telemetry.stage === 1 && (
                <div>
                  <div className="w-full bg-[#050508] h-2.5 border border-[#2A3B5C] p-[1px]">
                    <div
                      className={`h-full transition-all duration-100 ${
                        telemetry.isStabilized ? 'bg-[#00FF66]' : 'bg-[#FFB000]'
                      }`}
                      style={{ width: `${telemetry.stageTaskProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[8px] mt-1">
                    <span className="text-[#A0AEC0]">CALIBRATION: {telemetry.stageTaskProgress}%</span>
                    <span className={telemetry.isStabilized ? 'text-[#00FF66] font-bold' : 'text-[#FFB000]'}>
                      {telemetry.isStabilized ? '● STABILIZED' : '○ COUNTER DRIFT'}
                    </span>
                  </div>
                </div>
              )}

              {telemetry.stage === 2 && (
                <div>
                  <div className="w-full bg-[#050508] h-2.5 border border-[#2A3B5C] p-[1px]">
                    <div
                      className="h-full bg-[#00F0FF] transition-all duration-100"
                      style={{ width: `${(telemetry.energyCubesCollected / 3) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[8px] text-[#00F0FF] mt-1">
                    <span>HARVEST: {telemetry.energyCubesCollected} / 3 CUBES</span>
                    <span className="text-[#FFB000]">DODGE DEBRIS</span>
                  </div>
                </div>
              )}

              {telemetry.stage === 3 && (
                <div>
                  <div className="w-full bg-[#050508] h-2.5 border border-[#2A3B5C] p-[1px]">
                    <div
                      className="h-full bg-[#00FF66] transition-all duration-100"
                      style={{ width: `${telemetry.satelliteLockProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[8px] text-[#A0AEC0] mt-1">
                    <span>ALIGNMENT: {telemetry.satelliteLockProgress}%</span>
                    <span className={telemetry.satelliteAlignment < 8 ? 'text-[#00FF66] font-bold' : 'text-[#FFB000]'}>
                      {telemetry.satelliteDistance}M [{telemetry.satelliteAlignment}°]
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 8-Bit Radar Scope */}
          <div className="retro-window p-3 bg-[#0d111a]/90">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] text-[#A0AEC0]">RADAR SCOPE</span>
              <button
                onClick={onTriggerPulse}
                className="retro-btn-secondary text-[8px] px-2 py-0.5 text-[#00F0FF] cursor-pointer"
              >
                SCAN [SPACE]
              </button>
            </div>

            <div className="relative w-full h-28 bg-[#050508] border border-[#2A3B5C] flex items-center justify-center overflow-hidden">
              <div className="absolute w-20 h-20 border border-[#2A3B5C]/60" />
              <div className="absolute w-12 h-12 border border-[#2A3B5C]/40" />
              <div className="absolute w-full h-[1px] bg-[#2A3B5C]/40" />
              <div className="absolute h-full w-[1px] bg-[#2A3B5C]/40" />

              <div className="w-2 h-2 bg-[#00F0FF]" />

              {telemetry.radarBlips.map((blip, idx) => (
                <div
                  key={idx}
                  className={`absolute w-2 h-2 ${
                    blip.type === 'cube'
                      ? 'bg-[#00F0FF]'
                      : blip.type === 'satellite'
                      ? 'bg-[#00FF66] border border-[#FFFFFF]'
                      : 'bg-[#FF3344]'
                  }`}
                  style={{
                    transform: `translate(${blip.x * 46}px, ${blip.y * 46}px)`,
                  }}
                  title={`${blip.type.toUpperCase()} [${blip.distance}m]`}
                />
              ))}

              <div className="absolute top-1 left-2 text-[8px] text-[#64748B]">140M</div>
              <div className="absolute bottom-1 right-2 text-[8px] text-[#64748B]">ACTIVE</div>
            </div>
          </div>
        </aside>
      </div>

      {/* 3. BOTTOM FLIGHT DECK (Height 56px, max-w-640px centered) */}
      <footer className="w-full flex justify-center pb-3 pointer-events-auto">
        <div className="w-full max-w-[640px] h-14 retro-window px-3 md:px-4 flex items-center justify-between bg-[#0d111a]/95">
          {/* Throttle Bar */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[#A0AEC0]">THR</span>
            <div className="w-20 md:w-24 h-3 bg-[#050508] border border-[#2A3B5C] p-[1px]">
              <div
                className="h-full bg-[#00F0FF] transition-all duration-75"
                style={{ width: `${telemetry.throttle}%` }}
              />
            </div>
            <span className="text-[9px] text-[#FFFFFF]">{telemetry.throttle}%</span>
          </div>

          {/* Boost Capacitor */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[#A0AEC0]">BOOST</span>
            <div className="w-16 md:w-20 h-3 bg-[#050508] border border-[#2A3B5C] p-[1px]">
              <div
                className={`h-full transition-all duration-75 ${
                  telemetry.isBoosting ? 'bg-[#FFB000]' : 'bg-[#00F0FF]'
                }`}
                style={{ width: `${telemetry.boostCharge}%` }}
              />
            </div>
            <span className="text-[8px] text-[#64748B]">[SHIFT]</span>
          </div>

          {/* Action Actuators */}
          <div className="flex items-center gap-2">
            <button
              onClick={onCycleCamera}
              className="retro-btn-secondary h-8 px-2 text-[8px] flex items-center gap-1 cursor-pointer"
              title="Cycle Camera [C]"
            >
              <span>CAM:</span>
              <span className="text-[#00F0FF]">{telemetry.cameraMode}</span>
            </button>

            <button
              onClick={onToggleFlightAssist}
              className={`h-8 px-2 text-[8px] border cursor-pointer ${
                telemetry.flightAssist
                  ? 'border-[#00FF66] bg-[#0d111a] text-[#00FF66]'
                  : 'border-[#2A3B5C] bg-[#050508] text-[#64748B]'
              }`}
              title="Toggle Flight Assist [I]"
            >
              ASSIST {telemetry.flightAssist ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={onToggleMute}
              className="retro-btn-secondary h-8 px-2 text-[8px] text-[#A0AEC0] cursor-pointer"
              title="Toggle Audio [M]"
            >
              {telemetry.isMuted ? 'MUTE' : 'AUDIO'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
