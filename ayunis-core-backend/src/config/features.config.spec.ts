import { featuresConfig } from './features.config';

describe('featuresConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.FEATURE_SSO_LOGIN_ENABLED;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults user-facing SSO login to disabled', () => {
    expect(featuresConfig().ssoLoginEnabled).toBe(false);
  });

  it('enables user-facing SSO login only when explicitly true', () => {
    process.env.FEATURE_SSO_LOGIN_ENABLED = 'true';

    expect(featuresConfig().ssoLoginEnabled).toBe(true);
  });
});
