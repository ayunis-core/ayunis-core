export function validateExternalSubscriptionRules(
  env: Record<string, unknown>,
): string[] {
  if (
    env.APP_ENVIRONMENT !== 'cloud' ||
    env.FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED !== 'true'
  )
    return [];
  return env.CORE_CONNECT_SERVICE_TOKEN
    ? []
    : [
        'CORE_CONNECT_SERVICE_TOKEN is required when external subscription management is enabled',
      ];
}
