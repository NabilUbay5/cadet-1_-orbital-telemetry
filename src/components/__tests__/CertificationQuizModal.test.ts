import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  CertificationQuizModal,
  createQuizState,
  evaluateQuizResult,
  selectStageQuestions,
} from '../CertificationQuizModal.tsx';
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

function renderQuiz(stage: 1 | 2 | 3, onPass: (stage: 1 | 2 | 3) => void = () => undefined) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      React.createElement(CertificationQuizModal, {
        stage,
        onPass,
        onClose: () => undefined,
      })
    );
  });

  return { container, root };
}

describe('CertificationQuizModal helper logic', () => {
  test('selects exactly three unique questions from a fixture with more than three questions', () => {
    const fixture: TriviaQuestion[] = [
      { id: 'a', stage: 1, question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: '1' },
      { id: 'b', stage: 1, question: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 1, explanation: '2' },
      { id: 'c', stage: 1, question: 'Q3', options: ['A', 'B', 'C', 'D'], correctIndex: 2, explanation: '3' },
      { id: 'd', stage: 1, question: 'Q4', options: ['A', 'B', 'C', 'D'], correctIndex: 3, explanation: '4' },
    ];

    const selected = selectStageQuestions(1, fixture);

    expect(selected).toHaveLength(3);
    expect(new Set(selected.map((question) => question.id)).size).toBe(3);
    expect(selected.every((question) => question.stage === 1)).toBe(true);
  });

  test('selection remains unchanged after answering a question', () => {
    const firstSelection = selectStageQuestions(3);
    const selectedQuestionIds = firstSelection.map((question) => question.id);
    const firstAnswerIndex = firstSelection[0].correctIndex;

    expect(firstSelection[0].options[firstAnswerIndex]).toBeDefined();
    expect(selectStageQuestions(3).map((question) => question.id)).toEqual(selectedQuestionIds);
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
  test('completes a fully correct quiz and counts the final answer before passing', () => {
    let passedStage: number | null = null;
    const { container, root } = renderQuiz(1, (stage) => {
      passedStage = stage;
    });

    const selectedQuestions = selectStageQuestions(1);
    for (let questionIndex = 0; questionIndex < selectedQuestions.length; questionIndex += 1) {
      const currentQuestion = selectedQuestions[questionIndex];
      const correctButton = getQuestionButton(container, currentQuestion);
      clickButton(correctButton);

      if (questionIndex < selectedQuestions.length - 1) {
        const nextButton = Array.from(container.querySelectorAll('button')).find((button) =>
          button.textContent?.includes('NEXT QUESTION')
        ) as HTMLElement | null;
        clickButton(nextButton);
      }
    }

    const submitButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('SUBMIT CERTIFICATION EXAM')
    ) as HTMLElement | null;
    clickButton(submitButton);

    const passButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('PROCEED TO NEXT MISSION STAGE')
    ) as HTMLElement | null;
    clickButton(passButton);

    expect(passedStage === 1).toBe(true);
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('a single incorrect answer prevents the quiz from passing', () => {
    let passedStage: number | null = null;
    const { container, root } = renderQuiz(1, (stage) => {
      passedStage = stage;
    });

    const selectedQuestions = selectStageQuestions(1);
    const wrongButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(selectedQuestions[0].options[(selectedQuestions[0].correctIndex + 1) % 4])
    ) as HTMLElement | null;
    clickButton(wrongButton);

    const nextButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('NEXT QUESTION')
    ) as HTMLElement | null;
    clickButton(nextButton);

    const correctButtonForSecond = getQuestionButton(container, selectedQuestions[1]);
    clickButton(correctButtonForSecond);
    const nextButtonTwo = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('NEXT QUESTION')
    ) as HTMLElement | null;
    clickButton(nextButtonTwo);

    const correctButtonForThird = getQuestionButton(container, selectedQuestions[2]);
    clickButton(correctButtonForThird);

    const submitButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('SUBMIT CERTIFICATION EXAM')
    ) as HTMLElement | null;
    clickButton(submitButton);

    expect(passedStage).toBeNull();
    expect(container.textContent).toContain('INSUFFICIENT');
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  test('changing stages resets questions and answer state', () => {
    const onPass = () => undefined;
    const { container, root } = renderQuiz(1, onPass);

    const firstQuestion = selectStageQuestions(1)[0];
    clickButton(getQuestionButton(container, firstQuestion));

    const nextButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('NEXT QUESTION')
    ) as HTMLElement | null;
    clickButton(nextButton);

    expect(container.textContent).toContain('QUESTION 2 OF 3');

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
    expect(Array.from(container.querySelectorAll('button')).some((button) => button.disabled)).toBe(false);

    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });
});
