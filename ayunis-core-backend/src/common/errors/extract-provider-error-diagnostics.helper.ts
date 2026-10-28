import {
  isProviderRateLimitDiagnostic,
  type ModelProviderError,
  parseRetryAfterMs,
  type ProviderRejectionReason,
} from '@ayunis/inference';
import { extractUpstreamStatus } from './extract-upstream-status.helper';
import { findPortableProviderError } from './find-portable-provider-error.helper';
import { redactProviderMessage } from './redact-provider-message.helper';

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
  UNSUPPORTED_PARAMETER: 'unsupported_parameter',
  CONTENT_FILTER: 'content_filter',
  AUTHENTICATION_FAILED: 'authentication_failed',
  IMAGE_TOO_LARGE: 'image_too_large',
  UNKNOWN_REQUEST_REJECTION: 'unknown_request_rejection',
} as const satisfies { [K in ProviderErrorReason as Uppercase<K>]: K };

// Every reason a provider package can report, plus the fallback for a 4xx it
// did not recognise; deriving it from the package union keeps the two in step.
export type ProviderErrorReason =
  ProviderRejectionReason | 'unknown_request_rejection';

const SAFE_SCALAR = /^[a-zA-Z0-9_$.[\]:-]+$/;

export function hasRateLimitDiagnostics(
  diagnostics: ProviderErrorDiagnostics,
): boolean {
  return (
    diagnostics.upstreamStatus === 429 ||
    isProviderRateLimitDiagnostic(diagnostics.upstreamCode) ||
    isProviderRateLimitDiagnostic(diagnostics.upstreamType)
  );
}

/**
 * The provider's own explanation of a rejection, redacted for logging. Kept
 * out of `ProviderErrorDiagnostics` on purpose: diagnostics travel into error
 * metadata, which 4xx responses expose to clients, while this text may still
 * carry the provider's wording about the request.
 */
export function extractProviderExplanation(error: unknown): string | undefined {
  const record = asRecord(portableErrorSource(error));
  const body = asRecord(read(record, 'error'));
  const nestedError = asRecord(read(body, 'error'));
  return redactProviderMessage(providerExplanation(record, body, nestedError));
}

export function extractProviderErrorDiagnostics(
  error: unknown,
): ProviderErrorDiagnostics {
  const portableError = findPortableProviderError(error);
  const diagnosticSource = portableError?.cause ?? error;
  const record = asRecord(diagnosticSource);
  const body = asRecord(read(record, 'error'));
  const nestedError = asRecord(read(body, 'error'));
  const response = asRecord(read(record, 'response'));
  const awsMetadata = asRecord(read(record, '$metadata'));
  const headers =
    asRecord(read(response, 'headers')) ?? asRecord(read(record, 'headers'));
  const upstreamStatus = firstDefined(
    portableError?.upstreamStatus,
    extractUpstreamStatus(diagnosticSource),
  );
  return compactDiagnostics({
    upstreamStatus,
    upstreamCode: extractCode(record, body),
    upstreamType: extractType(record, body, nestedError),
    upstreamParam: extractParam(record, body),
    upstreamRequestId: firstDefined(
      portableError?.upstreamRequestId,
      extractRequestId(record, body, headers, awsMetadata),
    ),
    upstreamReason: classifyReason(portableError, upstreamStatus),
    upstreamRetryAfterMs: firstDefined(
      portableError?.retryAfterMs,
      extractRetryAfterMs(headers),
    ),
  });
}

const MAX_VALIDATION_MESSAGES = 3;

/**
 * The explanation lives in the parsed error body where the SDK exposes one
 * (OpenAI-compatible `error.message`, Mistral's raw `body`). The SDK message
 * is the fallback; some SDKs prefix it with the status or append the raw
 * body, which `redactProviderMessage` cuts away.
 */
function providerExplanation(
  record: Record<string, unknown> | undefined,
  body: Record<string, unknown> | undefined,
  nestedError: Record<string, unknown> | undefined,
): string | undefined {
  return firstString(
    read(body, 'message'),
    read(nestedError, 'message'),
    rawBodyExplanation(read(record, 'body')),
    read(record, 'message'),
  );
}

/** Mistral keeps the response body as a JSON string on the error. */
function rawBodyExplanation(rawBody: unknown): string | undefined {
  if (typeof rawBody !== 'string') return undefined;
  const parsed = asRecord(parseJson(rawBody));
  const message = read(parsed, 'message');
  if (typeof message === 'string') return message;
  const detail = read(parsed, 'detail');
  const validationMessages = (Array.isArray(detail) ? detail : [])
    .map((item: unknown) => read(asRecord(item), 'msg'))
    .filter((msg): msg is string => typeof msg === 'string')
    .slice(0, MAX_VALIDATION_MESSAGES);
  return validationMessages.length > 0
    ? validationMessages.join('; ')
    : undefined;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/** `retry-after-ms` is non-standard but exact, so it wins over `retry-after`. */
function extractRetryAfterMs(
  headers: Record<string, unknown> | undefined,
): number | undefined {
  const millis = nonNegativeNumber(readHeader(headers, 'retry-after-ms'));
  if (millis !== undefined) return millis;
  return parseRetryAfterMs(readHeader(headers, 'retry-after'));
}

function nonNegativeNumber(value: unknown): number | undefined {
  const parsed =
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : undefined;
}

// Provider packages classify their own rejections (AYC-1255); the backend
// never parses provider wording.
function classifyReason(
  portableError: ModelProviderError | undefined,
  status: number | undefined,
): ProviderErrorReason | undefined {
  if (portableError?.rejectionReason) return portableError.rejectionReason;
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

function portableErrorSource(error: unknown): unknown {
  return findPortableProviderError(error)?.cause ?? error;
}

function firstDefined<T>(...values: Array<T | undefined>): T | undefined {
  return values.find((value): value is T => value !== undefined);
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
