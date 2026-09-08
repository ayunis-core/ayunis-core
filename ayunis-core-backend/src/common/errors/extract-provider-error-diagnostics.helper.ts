import { extractUpstreamStatus } from './extract-upstream-status.helper';

export interface ProviderErrorDiagnostics {
  upstreamStatus?: number;
  upstreamCode?: string;
  upstreamType?: string;
  upstreamParam?: string;
  upstreamRequestId?: string;
  upstreamReason?: ProviderErrorReason;
  /** Provider-requested pause before resending, from retry-after(-ms) headers. */
  upstreamRetryAfterMs?: number;
}

export const ProviderErrorReason = {
  INVALID_TOOL_SCHEMA: 'invalid_tool_schema',
  CONTEXT_LENGTH_EXCEEDED: 'context_length_exceeded',
  TOOL_LIMIT_EXCEEDED: 'tool_limit_exceeded',
  UNSUPPORTED_PARAMETER: 'unsupported_parameter',
  CONTENT_FILTER: 'content_filter',
  AUTHENTICATION_FAILED: 'authentication_failed',
  UNKNOWN_REQUEST_REJECTION: 'unknown_request_rejection',
} as const;

export type ProviderErrorReason =
  (typeof ProviderErrorReason)[keyof typeof ProviderErrorReason];

const SAFE_SCALAR = /^[a-zA-Z0-9_$.[\]:-]+$/;
const REASON_PATTERNS: ReadonlyArray<readonly [ProviderErrorReason, RegExp]> = [
  [
    ProviderErrorReason.INVALID_TOOL_SCHEMA,
    /invalid schema|function parameters|tool schema/i,
  ],
  [
    ProviderErrorReason.CONTEXT_LENGTH_EXCEEDED,
    /context length|maximum context|too many tokens/i,
  ],
  [
    ProviderErrorReason.TOOL_LIMIT_EXCEEDED,
    /too many tools|maximum number of tools|tool limit/i,
  ],
  [
    ProviderErrorReason.UNSUPPORTED_PARAMETER,
    /unsupported parameter|not supported.*parameter/i,
  ],
  [ProviderErrorReason.CONTENT_FILTER, /content filter/i],
  [
    ProviderErrorReason.AUTHENTICATION_FAILED,
    /authentication|unauthorized|invalid api key/i,
  ],
];

export function extractProviderErrorDiagnostics(
  error: unknown,
): ProviderErrorDiagnostics {
  const record = asRecord(error);
  const body = asRecord(read(record, 'error'));
  const nestedError = asRecord(read(body, 'error'));
  const response = asRecord(read(record, 'response'));
  const awsMetadata = asRecord(read(record, '$metadata'));
  const headers =
    asRecord(read(response, 'headers')) ?? asRecord(read(record, 'headers'));
  const upstreamStatus = extractUpstreamStatus(error);
  const message = firstString(
    read(record, 'message'),
    read(body, 'message'),
    read(nestedError, 'message'),
  );

  return compactDiagnostics({
    upstreamStatus,
    upstreamCode: extractCode(record, body),
    upstreamType: extractType(record, body, nestedError),
    upstreamParam: extractParam(record, body),
    upstreamRequestId: extractRequestId(record, body, headers, awsMetadata),
    upstreamReason: classifyReason(message, upstreamStatus),
    upstreamRetryAfterMs: extractRetryAfterMs(headers),
  });
}

/**
 * `retry-after-ms` is non-standard but exact; `retry-after` is seconds per
 * RFC 9110. Its HTTP-date form is deliberately not parsed — providers we
 * integrate send delay-seconds, and a date would need clock trust we lack.
 */
function extractRetryAfterMs(
  headers: Record<string, unknown> | undefined,
): number | undefined {
  const millis = nonNegativeNumber(readHeader(headers, 'retry-after-ms'));
  if (millis !== undefined) return millis;
  const seconds = nonNegativeNumber(readHeader(headers, 'retry-after'));
  return seconds === undefined ? undefined : seconds * 1000;
}

function nonNegativeNumber(value: unknown): number | undefined {
  const parsed =
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : undefined;
}

function classifyReason(
  message: string | undefined,
  status: number | undefined,
): ProviderErrorReason | undefined {
  const match = REASON_PATTERNS.find(([, pattern]) =>
    pattern.test(message ?? ''),
  );
  if (match) return match[0];
  return status !== undefined && status >= 400 && status < 500
    ? ProviderErrorReason.UNKNOWN_REQUEST_REJECTION
    : undefined;
}

function extractCode(
  record: Record<string, unknown> | undefined,
  body: Record<string, unknown> | undefined,
): string | undefined {
  return safeScalar(firstString(read(record, 'code'), read(body, 'code')));
}

function extractType(
  record: Record<string, unknown> | undefined,
  body: Record<string, unknown> | undefined,
  nestedError: Record<string, unknown> | undefined,
): string | undefined {
  return safeScalar(
    firstString(
      read(record, 'type'),
      read(body, 'type'),
      read(nestedError, 'type'),
    ),
  );
}

function extractParam(
  record: Record<string, unknown> | undefined,
  body: Record<string, unknown> | undefined,
): string | undefined {
  return safeScalar(
    firstString(read(record, 'param'), read(body, 'param')),
    256,
  );
}

function extractRequestId(
  record: Record<string, unknown> | undefined,
  body: Record<string, unknown> | undefined,
  headers: Record<string, unknown> | undefined,
  awsMetadata: Record<string, unknown> | undefined,
): string | undefined {
  return safeScalar(
    firstString(
      read(record, 'request_id'),
      read(record, 'requestId'),
      read(record, 'requestID'),
      read(body, 'request_id'),
      read(awsMetadata, 'requestId'),
      readHeader(headers, 'x-request-id'),
      readHeader(headers, 'request-id'),
      readHeader(headers, 'apim-request-id'),
    ),
    256,
  );
}

function read(
  record: Record<string, unknown> | undefined,
  key: string,
): unknown {
  return record ? record[key] : undefined;
}

function readHeader(
  headers: Record<string, unknown> | undefined,
  key: string,
): unknown {
  const get = read(headers, 'get');
  return typeof get === 'function'
    ? get.call(headers, key)
    : read(headers, key);
}

function safeScalar(
  value: string | undefined,
  maxLength = 128,
): string | undefined {
  if (!value || value.length > maxLength || !SAFE_SCALAR.test(value)) {
    return undefined;
  }
  return value;
}

function firstString(...values: unknown[]): string | undefined {
  return values.find(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function compactDiagnostics(
  diagnostics: ProviderErrorDiagnostics,
): ProviderErrorDiagnostics {
  return Object.fromEntries(
    Object.entries(diagnostics).filter(([, value]) => value !== undefined),
  );
}
