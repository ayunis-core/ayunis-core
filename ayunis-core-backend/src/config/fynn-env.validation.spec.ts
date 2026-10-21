import { validateFynnRules } from './fynn-env.validation';
const enabled = {
  APP_ENVIRONMENT: 'cloud',
  FEATURE_FYNN_MANAGED_SUBSCRIPTIONS_ENABLED: 'true',
};
describe('Fynn boot preflight', () => {
  it('does not require unused provider secrets when disabled or self-hosted', () => {
    expect(validateFynnRules({})).toEqual([]);
    expect(
      validateFynnRules({ ...enabled, APP_ENVIRONMENT: 'self-hosted' }),
    ).toEqual([]);
  });
  it.each(['https://preview.example/api/v1', 'http://127.0.0.1:9/api/v1'])(
    'allows a complete configuration with base %s',
    (base) => {
      expect(
        validateFynnRules({
          ...enabled,
          FYNN_API_KEY: 'local-key',
          FYNN_API_BASE_URL: base,
          CORE_CONNECT_SERVICE_TOKEN: 'local-service-token',
          POSTGRES_POOL_SIZE: '2',
        }),
      ).toEqual([]);
    },
  );
  it('reports all missing provider credentials without their values', () => {
    expect(validateFynnRules(enabled)).toHaveLength(3);
  });
  it('reserves capacity for both the cron coordinator and its work', () => {
    expect(
      validateFynnRules({ ...enabled, POSTGRES_POOL_SIZE: '1' }),
    ).toContain(
      'POSTGRES_POOL_SIZE must be at least 2 for Fynn reconciliation',
    );
  });
  it.each([
    'file:///tmp/billing',
    'http://external.example',
    'https://secret@example.com',
    'invalid',
  ])('rejects unsafe API base %s', (base) => {
    expect(
      validateFynnRules({
        ...enabled,
        FYNN_API_KEY: 'key',
        FYNN_API_BASE_URL: base,
        CORE_CONNECT_SERVICE_TOKEN: 'token',
      }),
    ).toHaveLength(1);
  });
});
