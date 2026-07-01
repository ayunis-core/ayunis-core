import type { QuizAnswerOption } from '../domain/academy-quiz-question.entity';
import { InvalidQuizQuestionError } from './academy.errors';

export const MIN_QUIZ_OPTIONS = 2;
export const MAX_QUIZ_OPTIONS = 6;

/**
 * Enforces the quiz question invariants that class-validator cannot express:
 * between MIN and MAX options, non-empty option texts, and exactly one option
 * marked as correct (single-correct multiple choice). Throws
 * InvalidQuizQuestionError otherwise.
 */
export function assertValidQuizOptions(options: QuizAnswerOption[]): void {
  if (options.length < MIN_QUIZ_OPTIONS || options.length > MAX_QUIZ_OPTIONS) {
    throw new InvalidQuizQuestionError(
      `A quiz question must have between ${MIN_QUIZ_OPTIONS} and ${MAX_QUIZ_OPTIONS} options`,
    );
  }
  if (options.some((option) => option.text.trim().length === 0)) {
    throw new InvalidQuizQuestionError('Quiz option texts must not be empty');
  }
  const correctCount = options.filter((option) => option.isCorrect).length;
  if (correctCount !== 1) {
    throw new InvalidQuizQuestionError(
      'A quiz question must have exactly one correct option',
    );
  }
}
