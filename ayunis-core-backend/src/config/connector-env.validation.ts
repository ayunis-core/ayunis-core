/**
 * Connector credentials are encrypted under their own key. It is required
 * only while connectors are enabled, so deployments without them need not
 * provision it; once set, it must be usable either way.
 */
export function validateConnectorRules(env: Record<string, unknown>): string[] {
  const encryptionKey = env.CONNECTOR_ENCRYPTION_KEY;
  if (encryptionKey === undefined) {
    return env.FEATURE_CONNECTORS_ENABLED === 'true'
      ? [
          'CONNECTOR_ENCRYPTION_KEY is required when FEATURE_CONNECTORS_ENABLED ' +
            'is "true" (generate one with `openssl rand -hex 32`)',
        ]
      : [];
  }
  if (
    typeof encryptionKey !== 'string' ||
    !/^[0-9a-f]{64}$/i.test(encryptionKey)
  ) {
    return [
      'CONNECTOR_ENCRYPTION_KEY must be a 64-character hex string (32 bytes; ' +
        'generate one with `openssl rand -hex 32`)',
    ];
  }
  return [];
}
