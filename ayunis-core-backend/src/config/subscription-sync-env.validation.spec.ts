import { validateSubscriptionSyncRules } from './subscription-sync-env.validation';
it('requires only the service credential for enabled cloud synchronization', () => {
  expect(
    validateSubscriptionSyncRules({
      APP_ENVIRONMENT: 'cloud',
      FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED: 'true',
    }),
  ).toHaveLength(1);
  expect(
    validateSubscriptionSyncRules({
      APP_ENVIRONMENT: 'cloud',
      FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED: 'true',
      CORE_CONNECT_SERVICE_TOKEN: 'service-test',
    }),
  ).toEqual([]);
});
it('does not require provider credentials or enable synchronization on self-hosted deployments', () => {
  expect(
    validateSubscriptionSyncRules({
      APP_ENVIRONMENT: 'self-hosted',
      FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED: 'true',
    }),
  ).toEqual([]);
});
it.each(['', ' ', '\t\r\n', 123, true, {}])(
  'rejects an enabled cloud service credential that is not a nonblank string: %p',
  (token) => {
    expect(
      validateSubscriptionSyncRules({
        APP_ENVIRONMENT: 'cloud',
        FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED: 'true',
        CORE_CONNECT_SERVICE_TOKEN: token,
      }),
    ).toHaveLength(1);
  },
);
it('does not require a service credential when external management is disabled', () => {
  expect(
    validateSubscriptionSyncRules({
      APP_ENVIRONMENT: 'cloud',
      FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED: 'false',
    }),
  ).toEqual([]);
});
