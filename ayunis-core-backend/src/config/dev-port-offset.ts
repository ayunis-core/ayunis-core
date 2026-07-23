/**
 * Slot-aware port derivation for local development.
 *
 * The ./dev script writes DEV_PORT_OFFSET=<slot*10> to .env.dev; all other
 * connection config lives at base (slot-0) values in Infisical or .env.
 * After the env files are merged, this offset is added to the known port
 * variables and to the port of localhost URLs, so a single number replaces
 * per-slot copies of the full connection config. Without DEV_PORT_OFFSET
 * (CI, production, contributors on slot 0) this is a no-op.
 */

const PORT_VARS = [
  'PORT',
  'POSTGRES_PORT',
  'MINIO_PORT',
  'REDIS_PORT',
  'SMTP_PORT',
] as const;

const URL_VARS = [
  'CODE_EXECUTION_SERVICE_URL',
  'ANONYMIZE_SERVICE_URL',
  'GOTENBERG_URL',
  'FRONTEND_BASEURL',
] as const;

const URL_LIST_VARS = ['CORS_ALLOWED_ORIGINS'] as const;

// Only URLs pointing at the local machine are slot-dependent; anything else
// (e.g. a remote service override) must pass through untouched.
const LOCAL_URL_WITH_PORT = /^(https?:\/\/(?:localhost|127\.0\.0\.1)):(\d+)/i;

function offsetLocalUrl(value: string, offset: number): string {
  return value.replace(
    LOCAL_URL_WITH_PORT,
    (_match, origin: string, port: string) =>
      `${origin}:${Number.parseInt(port, 10) + offset}`,
  );
}

function offsetPortVars(env: NodeJS.ProcessEnv, offset: number): void {
  for (const key of PORT_VARS) {
    const value = env[key];
    if (value !== undefined && /^\d+$/.test(value)) {
      env[key] = String(Number.parseInt(value, 10) + offset);
    }
  }
}

function offsetUrlVars(env: NodeJS.ProcessEnv, offset: number): void {
  for (const key of URL_VARS) {
    const value = env[key];
    if (value !== undefined) {
      env[key] = offsetLocalUrl(value, offset);
    }
  }
}

function offsetUrlListVars(env: NodeJS.ProcessEnv, offset: number): void {
  for (const key of URL_LIST_VARS) {
    const value = env[key];
    if (value !== undefined) {
      env[key] = value
        .split(',')
        .map((url) => offsetLocalUrl(url, offset))
        .join(',');
    }
  }
}

export function applyDevPortOffset(env: NodeJS.ProcessEnv = process.env): void {
  const offset = Number.parseInt(env.DEV_PORT_OFFSET ?? '', 10);
  if (!Number.isInteger(offset) || offset === 0) {
    return;
  }

  offsetPortVars(env, offset);
  offsetUrlVars(env, offset);
  offsetUrlListVars(env, offset);
}
