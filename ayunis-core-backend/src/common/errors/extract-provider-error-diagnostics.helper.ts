import { extractUpstreamStatus } from './extract-upstream-status.helper';

export interface ProviderErrorDiagnostics {
  upstreamStatus?: number;
  upstreamCode?: string;
  upstreamType?: string;
  upstreamParam?: string;
  upstreamRequestId?: string;
  upstreamReason?: ProviderErrorReason;
}

type ProviderErrorReason =
  | 'invalid_tool_schema'
  | 'context_length_exceeded'
  | 'tool_limit_exceeded'
  | 'unsupported_parameter'
  | 'content_filter'
  | 'authentication_failed'
  | 'unknown_request_rejection';

const SAFE_SCALAR = /^[a-zA-Z0-9_$.[\]:-]+$/;
const REASON_PATTERNS: ReadonlyArray<readonly [ProviderErrorReason, RegExp]> = [
  ['invalid_tool_schema', /invalid schema|function parameters|tool schema/i],
  [
    'context_length_exceeded',
    /context length|maximum context|too many tokens/i,
  ],
  ['tool_limit_exceeded', /too many tools|maximum number of tools|tool limit/i],
  ['unsupported_parameter', /unsupported parameter|not supported.*parameter/i],
  ['content_filter', /content filter/i],
  ['authentication_failed', /authentication|unauthorized|invalid api key/i],
];

export function extractProviderErrorDiagnostics(
  error: unknown,
): ProviderErrorDiagnostics {
  const record = asRecord(error);
  const body = asRecord(read(record, 'error'));
  const nestedError = asRecord(read(body, 'error'));
  const response = asRecord(read(record, 'response'));
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
    upstreamRequestId: extractRequestId(record, body, headers),
    upstreamReason: classifyReason(message, upstreamStatus),
  });
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
    ? 'unknown_request_rejection'
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
): string | undefined {
  return safeScalar(
    firstString(
      read(record, 'request_id'),
      read(record, 'requestId'),
      read(record, 'requestID'),
      read(body, 'request_id'),
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
