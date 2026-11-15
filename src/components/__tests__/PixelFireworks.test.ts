import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'bun:test';
import { VictoryModal } from '../Modals.tsx';
import { PixelFireworks } from '../PixelFireworks.tsx';

describe('PixelFireworks', () => {
  test('renders a decorative canvas for the continuous fireworks loop', () => {
    const markup = renderToStaticMarkup(React.createElement(PixelFireworks));

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('<canvas');
    expect(markup).toContain('pixel-fireworks');
  });

  test('keeps the player lives bar and lobby exit on the victory screen', () => {
    const result = {
      victory: true,
      reason: 'Mission complete',
      cadetRank: 'CHIEF ORBITAL COMMANDER',
      flightTimeFormatted: '01:00.0',
      metSeconds: 60,
      readinessScore: 100,
      hullDamageTaken: 0,
      missionRewardPoints: 0,
      academyStageRewardPoints: 0,
      certificationBonusPoints: 0,
      energyCubesCollected: 3,
      telemetryPodsCollected: 3,
      telemetryPodResearchPoints: 300,
      badgesEarned: 3,
      triviaScore: 9,
      totalTrivia: 9,
    };
    const markup = renderToStaticMarkup(React.createElement(VictoryModal, {
      result,
      totalResearchPoints: 300,
      lives: 2,
      maxLives: 3,
      onExit: () => {},
      onExportFlightLog: () => {},
      onMajorExplosion: () => {},
    }));

    expect(markup).toContain('MISSION ACCOMPLISHED');
    expect(markup).toContain('Lives: 2 of 3');
    expect(markup).toContain('EXIT LOBBY');
  });
});
