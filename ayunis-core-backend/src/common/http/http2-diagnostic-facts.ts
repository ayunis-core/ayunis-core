import { readFileSync } from 'node:fs';

const RESET_NAMES = [
  'NGHTTP2_NO_ERROR',
  'NGHTTP2_PROTOCOL_ERROR',
  'NGHTTP2_INTERNAL_ERROR',
  'NGHTTP2_FLOW_CONTROL_ERROR',
  'NGHTTP2_SETTINGS_TIMEOUT',
  'NGHTTP2_STREAM_CLOSED',
  'NGHTTP2_FRAME_SIZE_ERROR',
  'NGHTTP2_REFUSED_STREAM',
  'NGHTTP2_CANCEL',
  'NGHTTP2_COMPRESSION_ERROR',
  'NGHTTP2_CONNECT_ERROR',
  'NGHTTP2_ENHANCE_YOUR_CALM',
  'NGHTTP2_INADEQUATE_SECURITY',
  'NGHTTP2_HTTP_1_1_REQUIRED',
] as const;

const ERROR_CODES = new Set([
  'ERR_HTTP2_STREAM_ERROR',
  'ERR_HTTP2_SESSION_ERROR',
  'ERR_HTTP2_GOAWAY_SESSION',
  'ERR_HTTP2_INVALID_SESSION',
  'ERR_HTTP2_STREAM_CANCEL',
  'ERR_HTTP2_ERROR',
]);

export function http2ErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return undefined;
  }
  const code: unknown = error.code;
  return typeof code === 'string' && ERROR_CODES.has(code) ? code : undefined;
}

export function http2Number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

export function http2ResetName(code: number | undefined): string | undefined {
  return code === undefined ? undefined : (RESET_NAMES[code] ?? 'UNKNOWN');
}

export function http2RuntimeVersions() {
  return {
    nodeVersion: process.versions.node,
    bundledUndiciVersion: process.versions.undici ?? 'unknown',
    installedUndiciVersion: installedUndiciVersion(),
  };
}

function installedUndiciVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(require.resolve('undici/package.json'), 'utf8'),
    ) as { version?: unknown };
    return typeof pkg.version === 'string' &&
      /^\d+\.\d+\.\d+$/.test(pkg.version)
      ? pkg.version
      : 'unknown';
  } catch {
    return 'unknown';
  }
}

const GOAWAY_REASONS = new Set([
  'too_many_pings',
  'too_many_requests',
  'too_many_streams',
  'excessive_load',
  'rate_limit_exceeded',
]);

export function http2GoawayReason(data: unknown): string | undefined {
  if (!Buffer.isBuffer(data) || data.length > 64) return undefined;
  const reason = data.toString('utf8');
  return GOAWAY_REASONS.has(reason) ? reason : undefined;
}
