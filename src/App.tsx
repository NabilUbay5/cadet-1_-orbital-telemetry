/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { CertificationQuizModal } from './components/CertificationQuizModal.tsx';
import { HUD } from './components/HUD.tsx';
import { OutpostMode } from './components/OutpostMode.tsx';
import { DefeatModal, PauseModal, VictoryModal } from './components/Modals.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';
import { audioEngine } from './game/audioEngine.ts';
import { FlightEngine } from './game/flightEngine.ts';
import {
  getAcademyCertificationBonus,
  getFlightAcademyStageResearchReward,
} from './game/missionLogic.ts';
import type { OutpostResearchReward } from './game/outpostLogic.ts';
import {
  addResearchPoints,
  claimResearchReward,
  createResearchBankBackup,
  parseResearchBankBackup,
  readResearchBalance,
  writeResearchBalance,
} from './game/researchBank.ts';
import { recordHighScore, readHighScore } from './game/scoreLogic.ts';
import { isValidTelemetryData } from './game/telemetryValidation.ts';
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
  lives: 3,
  maxLives: 3,
  isInvulnerable: false,
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

  telemetryPodsCollected: 0,
  totalTelemetryPods: 3,

  satelliteDistance: 340,
  satelliteAlignment: 0,
  satelliteLockProgress: 0,

  waypointsPassed: 1,
  totalWaypoints: 3,

  hazardWarning: false,
  hazardDistance: 999,
  radarBlips: [],
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FlightEngine | null>(null);
  const gameStateRef = useRef<GameState>('TITLE');
  const creditedResearchEventsRef = useRef(new Set<string>());

  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [telemetry, setTelemetry] = useState<TelemetryData>(initialTelemetry);
  const [missionResult, setMissionResult] = useState<MissionResult | null>(null);
  const [activeQuizStage, setActiveQuizStage] = useState<MissionStage | null>(null);
  const [badgesUnlocked, setBadgesUnlocked] = useState<string[]>([]);
  const [outpostOpen, setOutpostOpen] = useState(false);
  const [researchBalance, setResearchBalance] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [newHighScore, setNewHighScore] = useState(false);
  const [researchSaveError, setResearchSaveError] = useState(false);
  const [scoreSaveError, setScoreSaveError] = useState(false);
  const [researchBackupMessage, setResearchBackupMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const creditResearchOnce = (eventId: string, points: number) => {
    if (!claimResearchReward(creditedResearchEventsRef.current, eventId)) return;
    try {
      setResearchBalance(addResearchPoints(window.localStorage, points));
      setResearchSaveError(false);
    } catch (error) {
      console.error('Unable to save research points.', error);
      setResearchBalance((balance) => balance + points);
      setResearchSaveError(true);
    }
  };

  const updateScore = (nextScore: number) => {
    setScore(nextScore);
  };

  const finalizeHighScore = (finalScore: number): boolean => {
    try {
      const result = recordHighScore(window.localStorage, finalScore);
      setHighScore(result.highScore);
      setNewHighScore(result.isNewHighScore);
      setScoreSaveError(false);
      return result.isNewHighScore;
    } catch (error) {
      console.error('Unable to save the high score.', error);
      setScoreSaveError(true);
      setNewHighScore(false);
      return false;
    }
  };

  useEffect(() => {
    try {
      setResearchBalance(readResearchBalance(window.localStorage));
    } catch (error) {
      console.error('Unable to load the saved research balance.', error);
      setResearchSaveError(true);
    }
    try {
      const savedHighScore = readHighScore(window.localStorage);
      setHighScore(savedHighScore);
    } catch (error) {
      console.error('Unable to load the saved high score.', error);
      setScoreSaveError(true);
    }
  }, []);

  // Mount Three.js Engine once
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new FlightEngine(canvasMountRef.current, {
      onTelemetryUpdate: (data) => {
        if (!isValidTelemetryData(data)) {
          console.error('Flight engine emitted invalid telemetry; update skipped.', data);
          return;
        }
        setTelemetry(data);
      },
      onScoreUpdate: updateScore,
      onStateChange: (state, result) => {
        if (
          state === 'PLAYING'
          && (gameStateRef.current === 'TITLE' || gameStateRef.current === 'VICTORY' || gameStateRef.current === 'DEFEAT')
        ) {
          creditedResearchEventsRef.current.clear();
        }
        gameStateRef.current = state;
        setGameState(state);
        if (result) {
          setMissionResult(result);
          finalizeHighScore(result.score);
          creditResearchOnce('flight-telemetry-pods', result.telemetryPodResearchPoints);
        }
      },
      onStageTaskCompleted: (stage) => {
        // Pause physics and thruster so the cadet can focus safely on the exam
        engineRef.current?.setInputEnabled(false);
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
    creditedResearchEventsRef.current.clear();
    setActiveQuizStage(null);
    setBadgesUnlocked([]);
    setNewHighScore(false);
    updateScore(0);
    engineRef.current?.resetSimulation();
    setGameState('PLAYING');
  };

  // Outpost Ops is a separate turn-based mode drawn over the title scene.
  // The flight engine's keyboard handling is switched off while it is open.
  const handleOpenOutpost = () => {
    engineRef.current?.setInputEnabled(false);
    setOutpostOpen(true);
  };

  const handleCloseOutpost = () => {
    engineRef.current?.setInputEnabled(true);
    setOutpostOpen(false);
  };

  // Enter on the title screen opens Outpost Ops, the mode built for the challenge.
  useEffect(() => {
    if (gameState !== 'TITLE' || outpostOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Enter' || e.repeat) return;
      if (e.target instanceof HTMLElement && e.target.closest('button, a, input, select, textarea')) return;
      e.preventDefault();
      engineRef.current?.setInputEnabled(false);
      setOutpostOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, outpostOpen]);

  const handleResume = () => {
    engineRef.current?.setGameState('PLAYING');
    gameStateRef.current = 'PLAYING';
    setGameState('PLAYING');
  };

  const handleRestart = () => {
    creditedResearchEventsRef.current.clear();
    setActiveQuizStage(null);
    setBadgesUnlocked([]);
    setNewHighScore(false);
    updateScore(0);
    engineRef.current?.resetSimulation();
    setGameState('PLAYING');
  };

  const handleReturnToLobby = () => {
    let scoreToKeep = missionResult?.score ?? null;
    if (gameStateRef.current === 'PAUSED') {
      const finalScore = engineRef.current?.finalizeCurrentRunScore();
      if (finalScore) {
        scoreToKeep = finalScore.total;
        finalizeHighScore(finalScore.total);
      }
    }
    setActiveQuizStage(null);
    setMissionResult(null);
    setBadgesUnlocked([]);
    setTelemetry(initialTelemetry);
    engineRef.current?.resetSimulation();
    engineRef.current?.setGameState('TITLE');
    gameStateRef.current = 'TITLE';
    setGameState('TITLE');
    if (scoreToKeep !== null) updateScore(scoreToKeep);
  };

  const handlePause = () => {
    engineRef.current?.setGameState('PAUSED');
    gameStateRef.current = 'PAUSED';
    setGameState('PAUSED');
  };

  const handleCycleCamera = () => {
    engineRef.current?.cycleCamera();
  };

  const handleToggleFlightAssist = () => {
    engineRef.current?.toggleFlightAssist();
  };

  const handleToggleMute = () => {
    audioEngine.ensureRunning();
    const isMuted = audioEngine.toggleMute();
    setTelemetry((prev) => ({ ...prev, isMuted }));
  };

  const handleTriggerPulse = () => {
    engineRef.current?.triggerScannerPulse();
  };

  const handleExportFlightLog = () => {
    if (!engineRef.current) throw new Error('Flight engine unavailable');
    engineRef.current.exportTelemetryLog();
  };

  const handleExportResearchBank = () => {
    try {
      const backup = createResearchBankBackup(researchBalance);
      const url = URL.createObjectURL(new Blob([backup], { type: 'application/json' }));
      const download = document.createElement('a');
      download.href = url;
      download.download = `cadet-1-research-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(download);
      download.click();
      download.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setResearchBackupMessage({ kind: 'success', text: 'Research backup exported.' });
    } catch (error) {
      console.error('Unable to export the research bank backup.', error);
      setResearchBackupMessage({ kind: 'error', text: 'Unable to export the research backup.' });
    }
  };

  const handleOutpostMissionStart = () => {
    creditedResearchEventsRef.current.delete('outpost-mission');
    setNewHighScore(false);
    updateScore(0);
  };

  const handleOutpostMissionComplete = (reward: OutpostResearchReward) => {
    creditResearchOnce('outpost-mission', reward.points);
  };

  const handleOutpostScoreUpdate = (nextScore: number) => {
    updateScore(nextScore);
  };

  const handleImportResearchBank = async (file: File) => {
    try {
      if (file.size > 16_384) {
        throw new TypeError('Backup file is too large.');
      }

      const backup = parseResearchBankBackup(await file.text());
      const restoredBalance = writeResearchBalance(window.localStorage, backup.balance);
      setResearchBalance(restoredBalance);
      setResearchSaveError(false);
      setResearchBackupMessage({
        kind: 'success',
        text: `Research balance restored: ${restoredBalance} RP. The previous balance was replaced.`,
      });
    } catch (error) {
      console.error('Unable to import the research bank backup.', error);
      setResearchBackupMessage({
        kind: 'error',
        text: error instanceof Error ? `Import failed: ${error.message}` : 'Import failed. The saved balance was not changed.',
      });
    }
  };

  // Trivia Certification Passed Handler
  const handlePassQuiz = (passedStage: MissionStage) => {
    creditResearchOnce(
      `flight-academy-stage-${passedStage}`,
      getFlightAcademyStageResearchReward(passedStage),
    );
    if (passedStage === 3) {
      creditResearchOnce(
        'flight-academy-certification',
        getAcademyCertificationBonus(3),
      );
    }

    engineRef.current?.setInputEnabled(true);
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
    <div className="relative w-screen h-dvh bg-[#050508] overflow-hidden select-none">
      {/* 3D WebGL Canvas Mount Container */}
      <div ref={canvasMountRef} data-testid="flight-canvas" className="absolute inset-0 z-0 flight-canvas" />

      {/* 8-Bit CRT Scanlines & Vignette Filter */}
      <div className="absolute inset-0 pointer-events-none crt-overlay z-[5] opacity-45" />

      {/* Title Screen Overlay */}
      {gameState === 'TITLE' && !outpostOpen && (
        <TitleScreen
          researchBalance={researchBalance}
          score={score}
          highScore={highScore}
          onStart={handleStart}
          onOutpost={handleOpenOutpost}
          onExportResearchBank={handleExportResearchBank}
          onImportResearchBank={handleImportResearchBank}
        />
      )}

      {/* Outpost Ops: Moon/Mars base management mode */}
      {gameState === 'TITLE' && outpostOpen && (
        <OutpostMode
          researchBalance={researchBalance}
          highScore={highScore}
          onMissionStart={handleOutpostMissionStart}
          onMissionComplete={handleOutpostMissionComplete}
          onScoreUpdate={handleOutpostScoreUpdate}
          onFinalizeScore={finalizeHighScore}
          onExit={handleCloseOutpost}
        />
      )}

      {/* Active Flight Telemetry HUD */}
      {gameState === 'PLAYING' && (
        <HUD
          telemetry={telemetry}
          score={score}
          highScore={highScore}
          researchBalance={researchBalance}
          inert={activeQuizStage !== null}
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
          onCorrectAnswer={(questionId) => engineRef.current?.awardQuizAnswer(questionId)}
          onClose={() => setActiveQuizStage(null)}
        />
      )}

      {/* Modals */}
      {gameState === 'PAUSED' && (
        <PauseModal
          onExportFlightLog={handleExportFlightLog}
          onResume={handleResume}
          onRestart={handleRestart}
          onExit={handleReturnToLobby}
        />
      )}

      {gameState === 'VICTORY' && missionResult && (
        <VictoryModal
          onExportFlightLog={handleExportFlightLog}
          result={missionResult}
          totalResearchPoints={researchBalance}
          highScore={highScore}
          newHighScore={newHighScore}
          onRestart={handleRestart}
          onExit={handleReturnToLobby}
        />
      )}

      {gameState === 'DEFEAT' && missionResult && (
        <DefeatModal
          onExportFlightLog={handleExportFlightLog}
          result={missionResult}
          totalResearchPoints={researchBalance}
          highScore={highScore}
          newHighScore={newHighScore}
          onRestart={handleRestart}
          onExit={handleReturnToLobby}
        />
      )}
      {researchSaveError && (
        <div role="alert" className="fixed bottom-12 left-2 z-50 border border-[#FF3344] bg-[#0d111a] px-3 py-2 text-[9px] text-[#FF3344] font-pixel">
          RESEARCH BANK STORAGE UNAVAILABLE · BALANCE MAY NOT SURVIVE RELOAD
        </div>
      )}
      {scoreSaveError && (
        <div role="alert" className="fixed bottom-2 left-2 z-50 border border-[#FF3344] bg-[#0d111a] px-3 py-2 text-[9px] text-[#FF3344] font-pixel">
          HI-SCORE STORAGE UNAVAILABLE · SCORE MAY NOT SURVIVE RELOAD
        </div>
      )}
      {researchBackupMessage && (
        <div
          role={researchBackupMessage.kind === 'error' ? 'alert' : 'status'}
          className={`fixed bottom-2 right-2 z-50 max-w-[min(90vw,28rem)] border bg-[#0d111a] px-3 py-2 text-[9px] font-pixel ${
            researchBackupMessage.kind === 'error' ? 'border-[#FF3344] text-[#FF3344]' : 'border-[#00FF66] text-[#00FF66]'
          }`}
        >
          {researchBackupMessage.text}
        </div>
      )}
    </div>
  );
}
