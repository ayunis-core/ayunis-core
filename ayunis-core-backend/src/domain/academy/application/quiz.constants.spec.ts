import { requiredCorrect } from './quiz.constants';

describe('requiredCorrect', () => {
  it.each([
    [10, 80, 8],
    [7, 80, 6],
    [5, 80, 4],
    [10, 100, 10],
    [10, 50, 5],
    [3, 80, 3],
    [1, 80, 1],
  ])('requires %i*%i%% -> %i correct', (total, thresholdPct, expected) => {
    expect(requiredCorrect(total, thresholdPct)).toBe(expected);
  });
});
