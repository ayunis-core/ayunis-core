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

describe('Outlook add-in', () => {
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
    if (flag === undefined) delete process.env.FEATURE_OUTLOOK_ADDIN_ENABLED;
    else process.env.FEATURE_OUTLOOK_ADDIN_ENABLED = flag;
    expect(featuresConfig().outlookAddinEnabled).toBe(expected);
  });
});

describe('Release notes', () => {
  const original = process.env;
  afterEach(() => {
    process.env = original;
  });

  it.each([
    ['true', 'bbcb0cc9-f4b8-4e54-a2a7-bfcac8b98154', true],
    ['true', undefined, false],
    ['true', ' ', false],
    ['false', 'bbcb0cc9-f4b8-4e54-a2a7-bfcac8b98154', false],
    [undefined, 'bbcb0cc9-f4b8-4e54-a2a7-bfcac8b98154', false],
  ])(
    'with routines flag %p and Announcable org ID %p resolves to %s',
    (routines, orgId, expected) => {
      process.env = { ...original };
      if (routines === undefined) delete process.env.FEATURE_ROUTINES_ENABLED;
      else process.env.FEATURE_ROUTINES_ENABLED = routines;
      if (orgId === undefined) delete process.env.ANNOUNCABLE_ORG_ID;
      else process.env.ANNOUNCABLE_ORG_ID = orgId;
      expect(featuresConfig().releaseNotesEnabled).toBe(expected);
    },
  );
});

describe('Voice', () => {
  const original = process.env;
  afterEach(() => {
    process.env = original;
  });

  it.each([
    [undefined, false],
    ['', false],
    ['   ', false],
    ['mistral-key', true],
  ])('resolves Mistral API key %p to %s', (apiKey, expected) => {
    process.env = { ...original };
    if (apiKey === undefined) delete process.env.MISTRAL_API_KEY;
    else process.env.MISTRAL_API_KEY = apiKey;
    expect(featuresConfig().voiceEnabled).toBe(expected);
  });
});

describe('Read aloud', () => {
  const original = process.env;
  afterEach(() => {
    process.env = original;
  });

  it.each([
    [undefined, 'mistral-key', false],
    ['', 'mistral-key', false],
    ['false', 'mistral-key', false],
    ['true', 'mistral-key', true],
    ['true', undefined, false],
    ['true', ' ', false],
  ])(
    'with flag %p and Mistral API key %p resolves to %s',
    (flag, apiKey, expected) => {
      process.env = { ...original };
      if (flag === undefined) delete process.env.FEATURE_READ_ALOUD_ENABLED;
      else process.env.FEATURE_READ_ALOUD_ENABLED = flag;
      if (apiKey === undefined) delete process.env.MISTRAL_API_KEY;
      else process.env.MISTRAL_API_KEY = apiKey;
      expect(featuresConfig().readAloudEnabled).toBe(expected);
    },
  );
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
