import {
  isNonNegativeFinite,
  parsePositiveIntWithDefault,
  parseNonNegativeIntWithDefault,
} from './number.util';

describe('isNonNegativeFinite', () => {
  it.each([
    ['zero', 0, true],
    ['a positive number', 42.5, true],
    ['a negative number', -1, false],
    ['NaN', NaN, false],
    ['Infinity', Infinity, false],
  ])('handles %s', (_label, value, expected) => {
    expect(isNonNegativeFinite(value)).toBe(expected);
  });
});

describe('parsePositiveIntWithDefault', () => {
  it.each([
    ['a valid integer string', '65000', 65000],
    ['an unset variable', undefined, 100],
    ['an empty string', '', 100],
    ['a non-numeric string', 'abc', 100],
    ['zero', '0', 100],
    ['a negative number', '-5', 100],
    ['an integer with trailing units', '65000ms', 100],
    ['a decimal', '1.5', 100],
    ['a whitespace-padded integer', ' 65000 ', 65000],
  ])('handles %s', (_label, value, expected) => {
    expect(parsePositiveIntWithDefault(value, 100)).toBe(expected);
  });
});

describe('parseNonNegativeIntWithDefault', () => {
  it.each([
    ['a valid integer string', '30000', 30000],
    ['zero as a valid value', '0', 0],
    ['an unset variable', undefined, 100],
    ['an empty string', '', 100],
    ['a non-numeric string', 'abc', 100],
    ['a negative number', '-5', 100],
    ['an integer with trailing units', '30000ms', 100],
    ['a decimal', '0.5', 100],
  ])('handles %s', (_label, value, expected) => {
    expect(parseNonNegativeIntWithDefault(value, 100)).toBe(expected);
  });
});
