// Scheme, host and optional port only: no wildcard, path or CSP syntax can
// reach the frame-ancestors header.
const HTTPS_ORIGIN = /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*(:\d{1,5})?$/i;
const HTTP_OR_HTTPS_ORIGIN =
  /^https?:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*(:\d{1,5})?$/i;

function splitOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function frameOrigins(
  value: string | undefined,
  fallback: readonly string[],
): readonly string[] {
  const origins = splitOrigins(value ?? '');
  return origins.length > 0 ? origins : fallback;
}

export function validateFrameOrigins(
  env: Record<string, unknown>,
  envKey: string,
): string[] {
  const value = env[envKey];
  if (value === undefined) {
    return [];
  }
  const isProduction = env.NODE_ENV === 'production';
  const pattern = isProduction ? HTTPS_ORIGIN : HTTP_OR_HTTPS_ORIGIN;
  if (
    typeof value === 'string' &&
    splitOrigins(value).every((o) => pattern.test(o))
  ) {
    return [];
  }
  return [
    `${envKey} must be a comma-separated list of ` +
      `${isProduction ? 'HTTPS ' : ''}origins (scheme, host and optional ` +
      `port; no wildcards or paths)`,
  ];
}
