import { describe, expect, test } from 'bun:test';
import {
  ACADEMY_CERTIFICATION_BONUS,
  getAcademyCertificationBonus,
  getFlightAcademyEarnedResearchReward,
  getFlightAcademyStageRewardTotal,
  getFlightAcademyStageResearchReward,
  STAGE1_RESEARCH_REWARD,
  STAGE2_RESEARCH_REWARD,
  STAGE3_RESEARCH_REWARD,
} from '../missionLogic.ts';
import {
  COMMANDER_RESEARCH_REWARD_MULTIPLIER,
  getOutpostResearchReward,
  MARS_MISSION_RESEARCH_REWARD,
  MOON_MISSION_RESEARCH_REWARD,
} from '../outpostLogic.ts';

describe('Flight Academy research rewards', () => {
  test('awards each stage on completion and adds the full certification bonus only at Stage 3', () => {
    expect(getFlightAcademyStageResearchReward(1)).toBe(STAGE1_RESEARCH_REWARD);
    expect(getFlightAcademyStageResearchReward(2)).toBe(STAGE2_RESEARCH_REWARD);
    expect(getFlightAcademyStageResearchReward(3)).toBe(STAGE3_RESEARCH_REWARD);
    expect(getAcademyCertificationBonus(1)).toBe(0);
    expect(getAcademyCertificationBonus(2)).toBe(0);
    expect(getAcademyCertificationBonus(3)).toBe(ACADEMY_CERTIFICATION_BONUS);
  });

  test('full certification totals 1,000 RP before telemetry pod bonuses', () => {
    expect(getFlightAcademyEarnedResearchReward(0)).toBe(0);
    expect(getFlightAcademyStageRewardTotal(1)).toBe(150);
    expect(getFlightAcademyStageRewardTotal(2)).toBe(400);
    expect(getFlightAcademyStageRewardTotal(3)).toBe(800);
    expect(getFlightAcademyEarnedResearchReward(3)).toBe(1000);
  });

  test('rejects invalid completed-stage counts', () => {
    expect(() => getFlightAcademyEarnedResearchReward(-1)).toThrow(RangeError);
    expect(() => getAcademyCertificationBonus(3.5)).toThrow(RangeError);
  });
});

describe('Outpost Ops research rewards', () => {
  test('awards the site-specific standard and hard completion rewards', () => {
    expect(getOutpostResearchReward('moon', 'cadet', 'complete').points).toBe(MOON_MISSION_RESEARCH_REWARD);
    expect(getOutpostResearchReward('mars', 'cadet', 'complete').points).toBe(MARS_MISSION_RESEARCH_REWARD);
    expect(getOutpostResearchReward('moon', 'cadet', 'complete').siteTier).toBe('Standard');
    expect(getOutpostResearchReward('mars', 'cadet', 'complete').siteTier).toBe('Hard');
  });

  test('applies the Commander difficulty multiplier to both sites', () => {
    const moon = getOutpostResearchReward('moon', 'commander', 'complete');
    const mars = getOutpostResearchReward('mars', 'commander', 'complete');

    expect(COMMANDER_RESEARCH_REWARD_MULTIPLIER).toBe(1.5);
    expect(moon.points).toBe(750);
    expect(moon.difficultyBonusPoints).toBe(250);
    expect(mars.points).toBe(1200);
    expect(mars.difficultyBonusPoints).toBe(400);
  });

  test('does not award completion RP for aborted or unfinished missions', () => {
    expect(getOutpostResearchReward('moon', 'commander', 'aborted').points).toBe(0);
    expect(getOutpostResearchReward('mars', 'cadet', null).points).toBe(0);
  });
});
