import { featuresConfig, parseBooleanWithDefault } from './features.config';

describe('Externally managed subscriptions', () => {
  const original = process.env;
  afterEach(() => {
    process.env = original;
  });

  it.each([
    ['cloud', undefined, false],
    ['cloud', '', false],
    ['cloud', 'false', false],
    ['cloud', 'true', true],
    ['self-hosted', 'true', false],
  ])('resolves %s with flag %s to %s', (environment, flag, expected) => {
    process.env = { ...original, APP_ENVIRONMENT: environment };
    if (flag === undefined)
      delete process.env.FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED;
    else process.env.FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED = flag;
    expect(featuresConfig().externalSubscriptionsEnabled).toBe(expected);
  });
});

describe('Routines', () => {
  const original = process.env;
  afterEach(() => {
    process.env = original;
  });

  it.each([
    [undefined, false],
    ['', false],
    ['false', false],
    ['true', true],
  ])('resolves flag %p to %s', (flag, expected) => {
    process.env = { ...original };
    if (flag === undefined) delete process.env.FEATURE_ROUTINES_ENABLED;
    else process.env.FEATURE_ROUTINES_ENABLED = flag;
    expect(featuresConfig().routinesEnabled).toBe(expected);
  });
});

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
