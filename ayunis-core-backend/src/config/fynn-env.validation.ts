export function validateFynnRules(env: Record<string, unknown>): string[] {
  if (
    env.APP_ENVIRONMENT !== 'cloud' ||
    env.FEATURE_FYNN_MANAGED_SUBSCRIPTIONS_ENABLED !== 'true'
  )
    return [];
  const required = [
    'FYNN_API_KEY',
    'FYNN_API_BASE_URL',
    'CORE_CONNECT_SERVICE_TOKEN',
  ];
  const errors = required
    .filter((key) => !env[key])
    .map((key) => `${key} is required when Fynn synchronization is enabled`);
  if (Number(env.POSTGRES_POOL_SIZE ?? 20) < 2)
    errors.push(
      'POSTGRES_POOL_SIZE must be at least 2 for Fynn reconciliation',
    );
  return [...errors, ...validateFynnBaseUrl(env.FYNN_API_BASE_URL)];
}

function validateFynnBaseUrl(base: unknown): string[] {
  if (typeof base !== 'string') return [];
  try {
    const url = new URL(base);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const allowedProtocol =
      url.protocol === 'https:' || (local && url.protocol === 'http:');
    if (
      !allowedProtocol ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      return [
        'FYNN_API_BASE_URL must be an HTTPS URL without credentials, query or fragment (HTTP allowed on loopback)',
      ];
    return [];
  } catch {
    return ['FYNN_API_BASE_URL must be a valid URL'];
  }
}
