import { featuresConfig } from './features.config';

describe('featuresConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.FEATURE_AGENT_RUNTIME_ENABLED;
    delete process.env.FEATURE_SSO_LOGIN_ENABLED;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults agent runtime routing to disabled', () => {
    expect(featuresConfig().agentRuntimeEnabled).toBe(false);
  });

  it('enables agent runtime routing only when explicitly true', () => {
    process.env.FEATURE_AGENT_RUNTIME_ENABLED = 'true';

    expect(featuresConfig().agentRuntimeEnabled).toBe(true);
  });

  it('defaults user-facing SSO login to disabled', () => {
    expect(featuresConfig().ssoLoginEnabled).toBe(false);
  });

  it('enables user-facing SSO login only when explicitly true', () => {
    process.env.FEATURE_SSO_LOGIN_ENABLED = 'true';

    expect(featuresConfig().ssoLoginEnabled).toBe(true);
  });
});
