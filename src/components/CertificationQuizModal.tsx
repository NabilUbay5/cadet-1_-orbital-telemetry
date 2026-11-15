/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from '../game/audioEngine.ts';
import { STAGE_BADGES, TRIVIA_QUESTIONS, TriviaQuestion } from '../data/triviaBank.ts';
import { MissionStage } from '../types/game.ts';
import { PixelBadge } from './PixelBadge.tsx';
import { PixelConfetti } from './PixelConfetti.tsx';

interface CertificationQuizModalProps {
  stage: MissionStage;
  onPass: (stage: MissionStage) => void;
  onClose: () => void;
}

function shuffleItems<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function randomizeQuestionAnswers(
  question: TriviaQuestion,
  random: () => number = Math.random
): TriviaQuestion {
  const shuffledOptions = shuffleItems(question.options, random) as [string, string, string, string];
  const correctAnswer = question.options[question.correctIndex];
  const correctIndex = shuffledOptions.indexOf(correctAnswer);

  if (correctIndex === -1) {
    return question;
  }

  return {
    ...question,
    options: shuffledOptions,
    correctIndex,
  };
}

export function selectStageQuestions(
  stage: MissionStage,
  stageQuestions: readonly TriviaQuestion[] = TRIVIA_QUESTIONS[stage],
  random: () => number = Math.random
): TriviaQuestion[] {
  const seenIds = new Set<string>();
  const uniqueQuestions: TriviaQuestion[] = [];
  for (const question of stageQuestions) {
    if (question.stage !== stage || seenIds.has(question.id)) continue;
    seenIds.add(question.id);
    uniqueQuestions.push(question);
  }

  if (uniqueQuestions.length < 3) {
    throw new RangeError(`Stage ${stage} requires at least three unique questions.`);
  }

  const randomizedQuestions = shuffleItems(uniqueQuestions, random).map((question) =>
    randomizeQuestionAnswers(question, random)
  );

  return randomizedQuestions.slice(0, 3);
}

export function createQuizState() {
  return {
    currentIdx: 0,
    selectedOption: null as number | null,
    answered: false,
    score: 0,
    quizFinished: false,
  };
}

export function evaluateQuizResult(score: number, totalQuestions: number): boolean {
  return score === totalQuestions;
}

export const CertificationQuizModal: React.FC<CertificationQuizModalProps> = ({
  stage,
  onPass,
}) => {
  const questions = useMemo(() => selectStageQuestions(stage), [stage]);
  const selectedQuestionIds = useMemo(
    () => questions.map((question) => question.id).join(','),
    [questions]
  );
  const badge = STAGE_BADGES[stage];

  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const scoreRef = useRef<number>(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setAnswered(false);
    setScore(0);
    scoreRef.current = 0;
    setQuizFinished(false);
    // Leave the HUD's focused control behind when this modal opens.
    dialogRef.current?.focus();
  }, [stage]);

  const currentQ = questions[currentIdx];

  const handleSelectOption = (idx: number) => {
    if (answered) return;
    audioEngine.ensureRunning();
    setSelectedOption(idx);
    setAnswered(true);

    const isCorrect = idx === currentQ.correctIndex;
    const nextScore = scoreRef.current + (isCorrect ? 1 : 0);
    scoreRef.current = nextScore;
    setScore(nextScore);

    if (isCorrect) {
      audioEngine.playQuizAnswer(true);
    } else {
      audioEngine.playQuizAnswer(false);
    }
  };

  const handleNext = () => {
    const latestScore = scoreRef.current;
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      setAnswered(false);
    } else {
      setQuizFinished(true);
      if (evaluateQuizResult(latestScore, questions.length)) {
        audioEngine.playQuizResult(true);
      } else {
        audioEngine.playQuizResult(false);
      }
    }
  };

  const handleRetry = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setAnswered(false);
    setScore(0);
    scoreRef.current = 0;
    setQuizFinished(false);
  };

  const isPassed = evaluateQuizResult(scoreRef.current, questions.length);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Astronaut certification: stage ${stage}`}
      tabIndex={-1}
      data-selected-question-ids={selectedQuestionIds}
      className="absolute inset-0 bg-[#050508]/92 flex items-center justify-center p-4 z-40 pointer-events-auto font-pixel"
    >
      {isPassed && <PixelConfetti />}
      <div className="relative z-10 w-full max-w-xl retro-window p-6 bg-[#0d111a] border-2 border-[#00F0FF] shadow-[6px_6px_0_#000]">
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
            <div
              className="border-2 border-[#2A3B5C] bg-[#050508] p-4 mb-4"
              data-question-id={currentQ.id}
            >
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
                <a
                  href={currentQ.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 text-[8px] text-[#00F0FF] underline"
                >
                  SOURCE: {currentQ.source.title}
                </a>
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
