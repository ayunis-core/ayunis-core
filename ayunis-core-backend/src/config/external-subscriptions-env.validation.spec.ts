import { validateExternalSubscriptionRules } from './external-subscriptions-env.validation';
it('requires only the service credential for enabled cloud synchronization', () => {
  expect(
    validateExternalSubscriptionRules({
      APP_ENVIRONMENT: 'cloud',
      FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED: 'true',
    }),
  ).toHaveLength(1);
  expect(
    validateExternalSubscriptionRules({
      APP_ENVIRONMENT: 'cloud',
      FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED: 'true',
      CORE_CONNECT_SERVICE_TOKEN: 'service-test',
    }),
  ).toEqual([]);
});
it('does not require provider credentials or enable synchronization on self-hosted deployments', () => {
  expect(
    validateExternalSubscriptionRules({
      APP_ENVIRONMENT: 'self-hosted',
      FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED: 'true',
    }),
  ).toEqual([]);
});
