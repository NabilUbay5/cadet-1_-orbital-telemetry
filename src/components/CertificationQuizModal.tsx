/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { soundManager } from '../audio/soundManager.ts';
import { STAGE_BADGES, TRIVIA_QUESTIONS, TriviaQuestion } from '../data/triviaBank.ts';
import { MissionStage } from '../types/game.ts';
import { PixelBadge } from './PixelBadge.tsx';

interface CertificationQuizModalProps {
  stage: MissionStage;
  onPass: (stage: MissionStage) => void;
  onClose: () => void;
}

export const CertificationQuizModal: React.FC<CertificationQuizModalProps> = ({
  stage,
  onPass,
}) => {
  const questions: TriviaQuestion[] = TRIVIA_QUESTIONS[stage];
  const badge = STAGE_BADGES[stage];

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  const currentQ = questions[currentIdx];

  const handleSelectOption = (idx: number) => {
    if (answered) return;
    setSelectedOption(idx);
    setAnswered(true);

    const isCorrect = idx === currentQ.correctIndex;
    if (isCorrect) {
      setScore((prev) => prev + 1);
      soundManager.playItemCollect();
    } else {
      soundManager.playWarning();
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      setAnswered(false);
    } else {
      setQuizFinished(true);
      // Passing requires all 3 questions answered correctly
      if (score === questions.length) {
        if (stage < 3) {
          soundManager.playDockSuccess();
        }
      } else {
        soundManager.playWarning();
      }
    }
  };

  const handleRetry = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setAnswered(false);
    setScore(0);
    setQuizFinished(false);
  };

  // Must answer all 3 questions correctly to pass
  const isPassed = score === questions.length;

  return (
    <div className="absolute inset-0 bg-[#050508]/92 flex items-center justify-center p-4 z-40 pointer-events-auto font-pixel">
      <div className="w-full max-w-xl retro-window p-6 bg-[#0d111a] border-2 border-[#00F0FF] shadow-[6px_6px_0_#000]">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b-2 border-[#2A3B5C] pb-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#00F0FF] inline-block animate-pulse" />
            <span className="text-[11px] md:text-xs text-[#00F0FF] uppercase tracking-wider">
              [ASTRONAUT CERTIFICATION: STAGE {stage}]
            </span>
          </div>
          <span className="text-[9px] text-[#FFB000] tracking-wider">EXAM GATEWAY</span>
        </div>

        {!quizFinished ? (
          <div>
            {/* Question Progress Tracker */}
            <div className="flex items-center justify-between text-[9px] text-[#A0AEC0] mb-3">
              <span>QUESTION {currentIdx + 1} OF 3</span>
              <span className={score === currentIdx + 1 ? 'text-[#00FF66]' : 'text-[#FFB000]'}>
                ACCURACY: {score} / {currentIdx + (answered ? 1 : 0)}
              </span>
            </div>

            {/* Question Prompt */}
            <div className="border-2 border-[#2A3B5C] bg-[#050508] p-4 mb-4">
              <div className="text-[9px] text-[#FFB000] mb-2 uppercase tracking-wide">
                ▶ TOPIC: {badge.title}
              </div>
              <p className="text-[10px] md:text-xs text-[#FFFFFF] leading-loose">
                {currentQ.question}
              </p>
            </div>

            {/* 4 Multiple Choice Options (A/B/C/D) */}
            <div className="space-y-2.5 mb-4">
              {currentQ.options.map((opt, idx) => {
                const letter = ['A', 'B', 'C', 'D'][idx];
                let btnStyle = 'border-2 border-[#2A3B5C] bg-[#0d111a] text-[#FFFFFF] hover:border-[#00F0FF]';

                if (answered) {
                  if (idx === currentQ.correctIndex) {
                    btnStyle = 'border-2 border-[#00FF66] bg-[#00FF66] text-[#050508] font-bold';
                  } else if (idx === selectedOption) {
                    btnStyle = 'border-2 border-[#FF3344] bg-[#FF3344] text-[#FFFFFF]';
                  } else {
                    btnStyle = 'border-2 border-[#2A3B5C] bg-[#050508] text-[#64748B] opacity-50';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={answered}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full p-3 text-left text-[9px] md:text-[10px] flex items-center gap-3 transition-none cursor-pointer ${btnStyle}`}
                  >
                    <span className="w-6 h-6 border border-current flex items-center justify-center shrink-0 text-[9px]">
                      {letter}
                    </span>
                    <span className="leading-relaxed">{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Educational Explanation Box */}
            {answered && (
              <div className="border border-[#2A3B5C] bg-[#050508] p-3 mb-4 text-[9px] leading-relaxed">
                <span className="text-[#00FF66] font-bold">FLIGHT LOG: </span>
                <span className="text-[#A0AEC0]">{currentQ.explanation}</span>
              </div>
            )}

            {/* Next Question CTA */}
            {answered && (
              <button
                onClick={handleNext}
                className="retro-btn w-full h-11 text-[10px] tracking-wider flex items-center justify-center cursor-pointer"
              >
                {currentIdx + 1 < questions.length ? 'NEXT QUESTION ▶' : 'SUBMIT CERTIFICATION EXAM ▶'}
              </button>
            )}
          </div>
        ) : (
          /* Quiz Results / Evaluation Screen */
          <div className="text-center py-2">
            {isPassed ? (
              <div>
                <div className="text-xs md:text-sm text-[#00FF66] uppercase tracking-wider mb-2 animate-pulse">
                  ★ CERTIFICATION PASSED! ★
                </div>
                <div className="text-[10px] text-[#A0AEC0] mb-5">
                  SCORE: <span className="text-[#00FF66] font-bold">3 / 3</span> (100% ACCURACY)
                </div>

                {/* Pixel Art Badge Showcase */}
                <div className="border-2 border-[#00FF66] bg-[#050508] p-5 mb-5 shadow-[4px_4px_0_#000] max-w-sm mx-auto flex flex-col items-center">
                  <PixelBadge stage={stage} size="lg" className="mb-3" />

                  <div className="text-xs text-[#00FF66] font-bold mb-1 tracking-wider uppercase">
                    {badge.title}
                  </div>
                  <div className="text-[9px] text-[#FFB000] mb-2 tracking-wide uppercase">
                    {badge.subtitle}
                  </div>
                  <div className="text-[8px] text-[#A0AEC0] leading-relaxed text-center">
                    {badge.description}
                  </div>
                </div>

                <button
                  onClick={() => onPass(stage)}
                  className="retro-btn w-full h-12 text-[10px] md:text-xs tracking-wider flex items-center justify-center cursor-pointer"
                >
                  {stage < 3 ? 'PROCEED TO NEXT MISSION STAGE ▶' : 'VIEW ASTRONAUT GRADUATION DIPLOMA ★'}
                </button>
              </div>
            ) : (
              <div>
                {/* Failure / Arcade Retry Alert */}
                <div className="text-xs md:text-sm text-[#FF3344] uppercase tracking-wider mb-2">
                  ★ EXAM SCORE INSUFFICIENT ★
                </div>
                <div className="text-[10px] text-[#A0AEC0] mb-4">
                  SCORE: <span className="text-[#FF3344] font-bold">{score} / 3</span> (REQUIRED: 3 / 3)
                </div>

                <div className="border-2 border-[#FF3344] bg-[#FF3344]/15 p-4 mb-5 text-[10px] md:text-[11px] text-[#FFB000] leading-relaxed animate-arcade-blink font-bold">
                  "RE-CALCULATING TRAJECTORY... TRY AGAIN, CADET!"
                </div>

                <p className="text-[9px] text-[#A0AEC0] mb-5 leading-loose max-w-md mx-auto">
                  Flight command requires 100% verified astronaut competence before granting stage clearance. Review your orbital telemetry and re-attempt the certification exam.
                </p>

                <button
                  onClick={handleRetry}
                  className="retro-btn w-full h-12 text-[10px] tracking-wider flex items-center justify-center cursor-pointer border-[#FFB000] bg-[#FFB000] text-[#050508] hover:bg-[#050508] hover:text-[#FFB000]"
                >
                  RE-ATTEMPT CERTIFICATION EXAM ↺
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
