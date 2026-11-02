import { validateSync } from 'class-validator';
import { IsFiniteDate } from './is-finite-date.validator';

class Sample {
  @IsFiniteDate() at: unknown;
}

function errorsFor(at: unknown) {
  return validateSync(Object.assign(new Sample(), { at }));
}

describe('IsFiniteDate', () => {
  it('accepts a real date', () => {
    expect(errorsFor(new Date('2026-11-01T00:00:00Z'))).toHaveLength(0);
  });

  it.each([
    ['an invalid date', new Date(NaN)],
    ['an ISO string', '2026-11-01T00:00:00Z'],
    ['a timestamp', 1_793_000_000_000],
    ['null', null],
  ])('rejects %s', (_label, at) => {
    expect(errorsFor(at)).toHaveLength(1);
  });
});
