import { parseBooleanWithDefault } from './features.config';

describe('parseBooleanWithDefault', () => {
  it.each([undefined, '', '   '])('uses the default for %p', (value) => {
    expect(parseBooleanWithDefault(value, true)).toBe(true);
    expect(parseBooleanWithDefault(value, false)).toBe(false);
  });

  it('is true only for an explicit "true"', () => {
    expect(parseBooleanWithDefault(' true ', false)).toBe(true);
    expect(parseBooleanWithDefault('false', true)).toBe(false);
    expect(parseBooleanWithDefault('yes', true)).toBe(false);
  });
});
