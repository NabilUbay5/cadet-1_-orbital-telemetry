/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { CertificationQuizModal } from './components/CertificationQuizModal.tsx';
import { HUD } from './components/HUD.tsx';
import { DefeatModal, PauseModal, VictoryModal } from './components/Modals.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';
import { FlightEngine } from './game/flightEngine.ts';
import { GameState, MissionResult, MissionStage, TelemetryData } from './types/game.ts';

const initialTelemetry: TelemetryData = {
  metSeconds: 0,
  velocity: 0,
  maxVelocity: 55,
  acceleration: 0,
  gForce: 1.0,
  pitch: 0,
  yaw: 0,
  roll: 0,
  driftAngle: 0,
  isInertialDrifting: false,
  hullIntegrity: 100,
  oxygen: 100,
  energy: 100,
  boostCharge: 100,
  isBoosting: false,
  throttle: 0,
  missionReadiness: 15,
  cameraMode: 'CHASE',
  flightAssist: true,
  isMuted: false,

  stage: 1,
  stageTitle: '01 // GROUND SCHOOL',
  stageTaskTitle: 'STABILIZE FLIGHT GYROS',
  stageTaskProgress: 0,
  stageTaskComplete: false,
  badgesUnlocked: [],

  stabilizationProgress: 0,
  isStabilized: false,
  vectorRingsPassed: 0,
  totalVectorRings: 3,

  energyCubesCollected: 0,
  totalEnergyCubes: 3,

  satelliteDistance: 340,
  satelliteAlignment: 0,
  satelliteLockProgress: 0,

  telemetryPodsCollected: 0,
  totalTelemetryPods: 3,
  energyCoresCollected: 0,
  totalEnergyCores: 3,
  waypointsPassed: 1,
  totalWaypoints: 3,

  hazardWarning: false,
  hazardDistance: 999,
  radarBlips: [],
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FlightEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [telemetry, setTelemetry] = useState<TelemetryData>(initialTelemetry);
  const [missionResult, setMissionResult] = useState<MissionResult | null>(null);
  const [activeQuizStage, setActiveQuizStage] = useState<MissionStage | null>(null);
  const [badgesUnlocked, setBadgesUnlocked] = useState<string[]>([]);

  // Mount Three.js Engine once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    let lastUpdate = 0;
    const engine = new FlightEngine(canvasMountRef.current, {
      onTelemetryUpdate: (data) => {
        const now = performance.now();
        if (now - lastUpdate >= 45) {
          lastUpdate = now;
          setTelemetry(data);
        }
      },
      onStateChange: (state, result) => {
        setGameState(state);
        if (result) {
          setMissionResult(result);
        }
      },
      onStageTaskCompleted: (stage) => {
        // Pause physics and thruster so the cadet can focus safely on the exam
        engineRef.current?.setGameState('PAUSED');
        setActiveQuizStage(stage);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStart = () => {
    setActiveQuizStage(null);
    setBadgesUnlocked([]);
    engineRef.current?.resetSimulation();
    setGameState('PLAYING');
  };

  const handleResume = () => {
    engineRef.current?.setGameState('PLAYING');
    setGameState('PLAYING');
  };

  const handleRestart = () => {
    setActiveQuizStage(null);
    setBadgesUnlocked([]);
    engineRef.current?.resetSimulation();
    setGameState('PLAYING');
  };

  const handleReturnToLobby = () => {
    setActiveQuizStage(null);
    setMissionResult(null);
    setBadgesUnlocked([]);
    setTelemetry(initialTelemetry);
    engineRef.current?.resetSimulation();
    engineRef.current?.setGameState('TITLE');
    setGameState('TITLE');
  };

  const handlePause = () => {
    engineRef.current?.setGameState('PAUSED');
    setGameState('PAUSED');
  };

  const handleCycleCamera = () => {
    engineRef.current?.cycleCamera();
  };

  const handleToggleFlightAssist = () => {
    engineRef.current?.toggleFlightAssist();
  };

  const handleToggleMute = () => {
    setTelemetry((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const handleTriggerPulse = () => {
    engineRef.current?.triggerScannerPulse();
  };

  // Trivia Certification Passed Handler
  const handlePassQuiz = (passedStage: MissionStage) => {
    const badgeId =
      passedStage === 1
        ? 'badge-gravity'
        : passedStage === 2
        ? 'badge-orbital'
        : 'badge-deepspace';

    const newBadges = Array.from(new Set([...badgesUnlocked, badgeId]));
    setBadgesUnlocked(newBadges);
    engineRef.current?.setBadges(newBadges);
    setActiveQuizStage(null);

    if (passedStage === 1) {
      engineRef.current?.advanceToStage(2);
      engineRef.current?.setGameState('PLAYING');
      setGameState('PLAYING');
    } else if (passedStage === 2) {
      engineRef.current?.advanceToStage(3);
      engineRef.current?.setGameState('PLAYING');
      setGameState('PLAYING');
    } else if (passedStage === 3) {
      engineRef.current?.triggerVictoryFinal();
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#050508] overflow-hidden select-none">
      {/* 3D WebGL Canvas Mount Container */}
      <div ref={canvasMountRef} className="absolute inset-0 z-0" />

      {/* 8-Bit CRT Scanlines & Vignette Filter */}
      <div className="absolute inset-0 pointer-events-none crt-overlay z-[5] opacity-45" />

      {/* Title Screen Overlay */}
      {gameState === 'TITLE' && <TitleScreen onStart={handleStart} />}

      {/* Active Flight Telemetry HUD */}
      {gameState === 'PLAYING' && (
        <HUD
          telemetry={telemetry}
          onCycleCamera={handleCycleCamera}
          onToggleFlightAssist={handleToggleFlightAssist}
          onToggleMute={handleToggleMute}
          onTriggerPulse={handleTriggerPulse}
          onPause={handlePause}
        />
      )}

      {/* Interactive 8-Bit Astronaut Certification Trivia Quiz Gate */}
      {activeQuizStage !== null && (
        <CertificationQuizModal
          stage={activeQuizStage}
          onPass={handlePassQuiz}
          onClose={() => setActiveQuizStage(null)}
        />
      )}

      {/* Modals */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onExit={handleReturnToLobby}
        />
      )}

      {gameState === 'VICTORY' && missionResult && (
        <VictoryModal
          result={missionResult}
          onRestart={handleRestart}
          onExit={handleReturnToLobby}
        />
      )}

      {gameState === 'DEFEAT' && missionResult && (
        <DefeatModal
          result={missionResult}
          onRestart={handleRestart}
          onExit={handleReturnToLobby}
        />
      )}
    </div>
  );
}
