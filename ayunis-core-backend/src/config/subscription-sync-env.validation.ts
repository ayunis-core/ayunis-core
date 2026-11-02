export function validateSubscriptionSyncRules(
  env: Record<string, unknown>,
): string[] {
  if (
    env.APP_ENVIRONMENT !== 'cloud' ||
    env.FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED !== 'true'
  )
    return [];
  const token = env.CORE_CONNECT_SERVICE_TOKEN;
  return typeof token === 'string' && token.trim().length > 0
    ? []
    : [
        'CORE_CONNECT_SERVICE_TOKEN is required when external subscription management is enabled',
      ];
}
