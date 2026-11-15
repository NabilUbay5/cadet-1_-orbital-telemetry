import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  CertificationQuizModal,
  createQuizState,
  evaluateQuizResult,
  randomizeQuestionAnswers,
  selectStageQuestions,
} from '../CertificationQuizModal.tsx';
import { TRIVIA_QUESTIONS } from '../../data/triviaBank.ts';
import type { TriviaQuestion } from '../../data/triviaBank.ts';

let dom: JSDOM;

beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
  Object.defineProperty(globalThis, 'window', { value: dom.window, configurable: true });
  Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true });
  Object.defineProperty(globalThis, 'Node', { value: dom.window.Node, configurable: true });
  Object.defineProperty(globalThis, 'HTMLElement', { value: dom.window.HTMLElement, configurable: true });
  Object.defineProperty(globalThis, 'MouseEvent', { value: dom.window.MouseEvent, configurable: true });
  Object.defineProperty(globalThis, 'getComputedStyle', {
    value: dom.window.getComputedStyle.bind(dom.window),
    configurable: true,
  });
  Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
    value: true,
    configurable: true,
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  dom.window.close();
});

function clickButton(button: HTMLElement | null) {
  expect(button).toBeTruthy();
  act(() => {
    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

function getQuestionButton(container: HTMLElement, question: TriviaQuestion) {
  const optionText = question.options[question.correctIndex];
  return Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(optionText)
  ) as HTMLElement | null;
}

function getCurrentQuestion(container: HTMLElement, stage: 1 | 2 | 3) {
  const questionId = container.querySelector('[data-question-id]')?.getAttribute('data-question-id');
  const question = TRIVIA_QUESTIONS[stage].find((item) => item.id === questionId);
  expect(question).toBeTruthy();
  if (!question) throw new Error(`No stage ${stage} question found for ${questionId}.`);
  return question;
}

function getButtonContaining(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(text)
  ) ?? null;
}

function getSelectedQuestionIds(container: HTMLElement) {
  return container.firstElementChild?.getAttribute('data-selected-question-ids')?.split(',') ?? [];
}

function renderQuiz(
  stage: 1 | 2 | 3,
  onPass: (stage: 1 | 2 | 3) => void = () => undefined,
  onCorrectAnswer: (questionId: string) => void = () => undefined,
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      React.createElement(CertificationQuizModal, {
        stage,
        onPass,
        onCorrectAnswer,
        onClose: () => undefined,
      })
    );
  });

  return { container, root };
}

describe('CertificationQuizModal helper logic', () => {
  test('selects exactly three unique questions from a fixture with more than three questions', () => {
    const fixture: TriviaQuestion[] = [
      { id: 'a', stage: 1, question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: '1', source: { title: 'NASA', url: 'https://science.nasa.gov/' } },
      { id: 'a', stage: 1, question: 'Q1 duplicate', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: 'duplicate', source: { title: 'NASA', url: 'https://science.nasa.gov/' } },
      { id: 'b', stage: 1, question: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 1, explanation: '2', source: { title: 'NASA', url: 'https://science.nasa.gov/' } },
      { id: 'c', stage: 1, question: 'Q3', options: ['A', 'B', 'C', 'D'], correctIndex: 2, explanation: '3', source: { title: 'NASA', url: 'https://science.nasa.gov/' } },
      { id: 'd', stage: 1, question: 'Q4', options: ['A', 'B', 'C', 'D'], correctIndex: 3, explanation: '4', source: { title: 'NASA', url: 'https://science.nasa.gov/' } },
      { id: 'e', stage: 1, question: 'Q5', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: '5', source: { title: 'NASA', url: 'https://science.nasa.gov/' } },
      { id: 'other-stage', stage: 2, question: 'Q6', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: '6', source: { title: 'NASA', url: 'https://science.nasa.gov/' } },
    ];

    const selected = selectStageQuestions(1, fixture, () => 0.5);

    expect(selected).toHaveLength(3);
    expect(new Set(selected.map((question) => question.id)).size).toBe(3);
    expect(selected.every((question) => question.stage === 1)).toBe(true);
    expect(selected.every((question) => fixture.some((item) => item.id === question.id))).toBe(true);
  });

  test('samples different unique questions from the expanded pool', () => {
    const stageQuestions = TRIVIA_QUESTIONS[3];
    const firstSelection = selectStageQuestions(3, stageQuestions, () => 0);
    const secondSelection = selectStageQuestions(3, stageQuestions, () => 0.999);

    expect(firstSelection).toHaveLength(3);
    expect(secondSelection).toHaveLength(3);
    expect(new Set(firstSelection.map((question) => question.id)).size).toBe(3);
    expect(new Set(secondSelection.map((question) => question.id)).size).toBe(3);
    expect(firstSelection.map((question) => question.id)).not.toEqual(
      secondSelection.map((question) => question.id)
    );
  });

  test('reorders answer choices while preserving the correct answer', () => {
    const question = {
      id: 'shuffle-test',
      stage: 1,
      question: 'WHY?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 2,
      explanation: 'Because',
      source: { title: 'NASA', url: 'https://science.nasa.gov/' },
    } satisfies TriviaQuestion;

    const sequence = [0.49, 0.49, 0.49];
    let index = 0;
    const shuffled = randomizeQuestionAnswers(question, () => sequence[index++] ?? 0.49);

    expect(shuffled).not.toEqual(question);
    expect(shuffled.options).toHaveLength(4);
    expect(new Set(shuffled.options).size).toBe(4);
    expect(shuffled.options[shuffled.correctIndex]).toBe(question.options[question.correctIndex]);
  });

  test('three correct answers pass and any incorrect answer fails', () => {
    const selectedQuestions = selectStageQuestions(1);

    expect(evaluateQuizResult(selectedQuestions.length, selectedQuestions.length)).toBe(true);
    expect(evaluateQuizResult(selectedQuestions.length - 1, selectedQuestions.length)).toBe(false);
  });

  test('starting a new stage resets the quiz state', () => {
    const freshStageState = createQuizState();

    expect(freshStageState).toEqual({
      currentIdx: 0,
      selectedOption: null,
      answered: false,
      score: 0,
      quizFinished: false,
    });
  });
});

describe('CertificationQuizModal component interaction', () => {
  test('reports each correct answer exactly once for score credit', () => {
    const correctQuestionIds: string[] = [];
    const { container, root } = renderQuiz(1, () => undefined, (questionId) => {
      correctQuestionIds.push(questionId);
    });
    const question = getCurrentQuestion(container, 1);
    clickButton(getQuestionButton(container, question));
    clickButton(getButtonContaining(container, 'NEXT QUESTION'));
    expect(correctQuestionIds).toEqual([question.id]);

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('completes a fully correct quiz and counts the final answer before passing', () => {
    const passedStages: number[] = [];
    const { container, root } = renderQuiz(1, (stage) => {
      passedStages.push(stage);
    });

    const selectedQuestionIds = getSelectedQuestionIds(container);
    expect(selectedQuestionIds).toHaveLength(3);
    for (let questionIndex = 0; questionIndex < selectedQuestionIds.length; questionIndex += 1) {
      const currentQuestion = getCurrentQuestion(container, 1);
      expect(currentQuestion.id).toBe(selectedQuestionIds[questionIndex]);
      const correctButton = getQuestionButton(container, currentQuestion);
      clickButton(correctButton);

      expect(getSelectedQuestionIds(container)).toEqual(selectedQuestionIds);
      expect(container.querySelector('a[href]')?.getAttribute('href')).toBe(currentQuestion.source.url);

      if (questionIndex < selectedQuestionIds.length - 1) {
        clickButton(getButtonContaining(container, 'NEXT QUESTION'));
      }
    }

    clickButton(getButtonContaining(container, 'SUBMIT CERTIFICATION EXAM'));

    expect(container.textContent).toContain('SCORE:');
    expect(container.textContent).toContain('3 / 3');
    expect(container.textContent).toContain('CERTIFICATION PASSED');
    expect(passedStages).toEqual([]);
    clickButton(getButtonContaining(container, 'PROCEED TO NEXT MISSION STAGE'));

    expect(passedStages).toEqual([1]);
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('shows confetti when each stage certification is passed', () => {
    for (const stage of [1, 2, 3] as const) {
      const { container, root } = renderQuiz(stage);
      const selectedQuestionIds = getSelectedQuestionIds(container);

      for (let questionIndex = 0; questionIndex < selectedQuestionIds.length; questionIndex += 1) {
        const question = getCurrentQuestion(container, stage);
        clickButton(getQuestionButton(container, question));
        if (questionIndex < selectedQuestionIds.length - 1) {
          clickButton(getButtonContaining(container, 'NEXT QUESTION'));
        }
      }

      clickButton(getButtonContaining(container, 'SUBMIT CERTIFICATION EXAM'));
      expect(container.querySelectorAll('.pixel-confetti-piece').length).toBe(48);

      act(() => {
        root.unmount();
      });
      document.body.removeChild(container);
    }
  });

  test('a single incorrect answer prevents the quiz from passing', () => {
    const passedStages: number[] = [];
    const { container, root } = renderQuiz(1, (stage) => {
      passedStages.push(stage);
    });

    const selectedQuestionIds = getSelectedQuestionIds(container);
    for (let questionIndex = 0; questionIndex < selectedQuestionIds.length; questionIndex += 1) {
      const question = getCurrentQuestion(container, 1);
      expect(question.id).toBe(selectedQuestionIds[questionIndex]);
      const option = questionIndex === selectedQuestionIds.length - 1
        ? question.options[(question.correctIndex + 1) % question.options.length]
        : question.options[question.correctIndex];
      clickButton(getButtonContaining(container, option));
      if (questionIndex < selectedQuestionIds.length - 1) {
        clickButton(getButtonContaining(container, 'NEXT QUESTION'));
      }
    }

    clickButton(getButtonContaining(container, 'SUBMIT CERTIFICATION EXAM'));

    expect(passedStages).toEqual([]);
    expect(container.textContent).toContain('INSUFFICIENT');
    expect(container.textContent).toContain('2 / 3');
    expect(container.querySelectorAll('.pixel-confetti-piece').length).toBe(0);
    expect(getButtonContaining(container, 'PROCEED TO NEXT MISSION STAGE')).toBeNull();
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('changing stages resets questions and answer state', () => {
    const onPass = () => undefined;
    const { container, root } = renderQuiz(1, onPass);

    const firstQuestion = getCurrentQuestion(container, 1);
    clickButton(getQuestionButton(container, firstQuestion));

    clickButton(getButtonContaining(container, 'NEXT QUESTION'));

    expect(container.textContent).toContain('QUESTION 2 OF 3');
    const priorQuestionIds = getSelectedQuestionIds(container);

    act(() => {
      root.render(
        React.createElement(CertificationQuizModal, {
          stage: 2,
          onPass,
          onClose: () => undefined,
        })
      );
    });

    expect(container.textContent).toContain('QUESTION 1 OF 3');
    expect(container.textContent).toContain('STAGE 2');
    expect(container.textContent).toContain('ACCURACY: 0 / 0');
    expect(Array.from(container.querySelectorAll('button')).some((button) => button.disabled)).toBe(false);
    expect(container.querySelector('a[href]')).toBeNull();
    const newQuestionIds = getSelectedQuestionIds(container);
    expect(newQuestionIds).toHaveLength(3);
    expect(new Set(newQuestionIds).size).toBe(3);
    expect(newQuestionIds.every((id) => TRIVIA_QUESTIONS[2].some((question) => question.id === id))).toBe(true);
    expect(newQuestionIds).not.toEqual(priorQuestionIds);

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
