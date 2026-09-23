/** Provider failure fact; retryability remains a host policy decision. */
export type ProviderFailureKind =
  | 'connection'
  | 'timeout'
  | 'server'
  | 'rate_limit'
  | 'rejection'
  | 'abort'
  | 'unknown';

/** Lifecycle boundary at which the provider SDK failed. */
export type ProviderFailureStage =
  'stream_establishment' | 'stream_consumption';

/**
 * Deadline source owned by a provider adapter. `response_start` and
 * `whole_stream` are transport safeguards; host idle and model-call deadlines
 * are intentionally outside this contract.
 */
export type ProviderTimeoutSource =
  'transport' | 'response_start' | 'whole_stream';

export interface ModelProviderErrorDetails {
  readonly kind: ProviderFailureKind;
  readonly stage: ProviderFailureStage;
  readonly upstreamStatus?: number;
  readonly upstreamRequestId?: string;
  readonly retryAfterMs?: number;
  readonly timeoutSource?: ProviderTimeoutSource;
  readonly transportCode?: string;
  readonly host?: string;
  readonly cause: unknown;
}

/**
 * Portable provider failure facts with a stable, non-sensitive message.
 * `cause` is retained for in-process diagnostics and must not be serialized or
 * logged without appropriate sanitization.
 */
export class ModelProviderError extends Error {
  /** Classification fact consumed by host-owned retry and reporting policy. */
  readonly kind: ProviderFailureKind;
  /** Distinguishes setup failures from failures after stream consumption began. */
  readonly stage: ProviderFailureStage;
  /** HTTP status received from the upstream provider, when available. */
  readonly upstreamStatus?: number;
  /** Sanitized provider request identifier suitable for correlation. */
  readonly upstreamRequestId?: string;
  /** Provider-requested delay, preserved without acting on it. */
  readonly retryAfterMs?: number;
  /** Adapter transport deadline that produced a timeout. */
  readonly timeoutSource?: ProviderTimeoutSource;
  /** Sanitized transport code from the SDK cause chain. */
  readonly transportCode?: string;
  /** Sanitized upstream host from the SDK cause chain. */
  readonly host?: string;
  /** Original SDK value for in-process diagnostics only. */
  override readonly cause: unknown;

  constructor(details: ModelProviderErrorDetails) {
    super('Model provider request failed', { cause: details.cause });
    this.name = new.target.name;
    this.kind = details.kind;
    this.stage = details.stage;
    this.upstreamStatus = details.upstreamStatus;
    this.upstreamRequestId = details.upstreamRequestId;
    this.retryAfterMs = details.retryAfterMs;
    this.timeoutSource = details.timeoutSource;
    this.transportCode = details.transportCode;
    this.host = details.host;
    this.cause = details.cause;
  }
}

export interface NormalizeProviderErrorOptions {
  readonly stage: ProviderFailureStage;
  readonly signal?: AbortSignal;
  readonly timeoutSource?: ProviderTimeoutSource;
  readonly timeoutSignal?: AbortSignal;
}

const CONNECTION_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ECONNABORTED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENETDOWN',
  'ENETRESET',
  'ERR_NETWORK',
  'UND_ERR_SOCKET',
  'UND_ERR_CLOSED',
  'UND_ERR_DESTROYED',
  'UND_ERR_CONNECT',
  'CERT_HAS_EXPIRED',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'ERR_TLS_HANDSHAKE_TIMEOUT',
]);

const TIMEOUT_CODES = new Set([
  'ETIMEDOUT',
  'ESOCKETTIMEDOUT',
  'ERR_SOCKET_TIMEOUT',
  'ERR_SOCKET_CONNECTION_TIMEOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
]);

const CONNECTION_NAMES = new Set([
  'APIConnectionError',
  'ConnectionError',
  'FetchError',
]);

const TIMEOUT_NAMES = new Set([
  'APIConnectionTimeoutError',
  'RequestTimeoutError',
  'TimeoutError',
]);

const ABORT_NAMES = new Set(['AbortError', 'APIUserAbortError']);

const REQUEST_ID_HEADERS = [
  'x-request-id',
  'request-id',
  'apim-request-id',
  'x-ms-request-id',
  'x-amzn-requestid',
  'x-amzn-request-id',
] as const;

const SAFE_DIAGNOSTIC = /^[a-zA-Z0-9_$.[\]:-]+$/;
const MAX_CAUSE_CHAIN_NODES = 16;

/**
 * Normalizes SDK failures into portable facts without applying retry policy.
 * Call only around SDK stream setup or iteration so local conversion and schema
 * errors remain distinct. The retained cause is in-process diagnostic data and
 * must not cross serialization or unsafe logging boundaries.
 */
export function normalizeProviderError(
  error: unknown,
  options: NormalizeProviderErrorOptions,
): ModelProviderError {
  if (error instanceof ModelProviderError) return error;

  const record = asRecord(error);
  const chain = collectCauseChain(error);
  const upstreamStatus = extractUpstreamStatus(record);
  const classification = classifyFailure(error, upstreamStatus, chain, options);

  return new ModelProviderError({
    ...classification,
    stage: options.stage,
    upstreamStatus,
    upstreamRequestId: extractRequestId(record),
    retryAfterMs: extractRetryAfterMs(record),
    cause: error,
  });
}

interface FailureClassification {
  readonly kind: ProviderFailureKind;
  readonly timeoutSource?: ProviderTimeoutSource;
  readonly transportCode?: string;
  readonly host?: string;
}

interface TransportClassification extends FailureClassification {
  readonly kind: 'connection' | 'timeout';
  readonly evidence: 'code' | 'name';
}

function classifyFailure(
  error: unknown,
  status: number | undefined,
  chain: readonly Record<string, unknown>[],
  options: NormalizeProviderErrorOptions,
): FailureClassification {
  if (signalCausedAbort(error, chain, options.timeoutSignal)) {
    return { kind: 'timeout', timeoutSource: options.timeoutSource };
  }
  if (signalCausedAbort(error, chain, options.signal)) return { kind: 'abort' };

  const transport = classifyTransport(chain);
  if (transport) return withTimeoutSource(transport, options.timeoutSource);

  const statusKind = classifyStatus(status);
  if (statusKind) return { kind: statusKind };
  if (chain.some((node) => nodeHasName(node, ABORT_NAMES))) {
    return { kind: 'abort' };
  }
  return { kind: 'unknown' };
}

function signalCausedAbort(
  error: unknown,
  chain: readonly Record<string, unknown>[],
  signal: AbortSignal | undefined,
): boolean {
  return Boolean(
    signal?.aborted &&
    (error === signal.reason ||
      chain.some((node) => nodeHasName(node, ABORT_NAMES))),
  );
}

function withTimeoutSource(
  transport: TransportClassification,
  hint: ProviderTimeoutSource | undefined,
): FailureClassification {
  if (transport.kind !== 'timeout') return transport;
  const timeoutSource = transport.evidence === 'code' ? 'transport' : hint;
  return {
    ...transport,
    timeoutSource: timeoutSource ?? 'transport',
  };
}

function classifyStatus(
  status: number | undefined,
):
  Exclude<ProviderFailureKind, 'connection' | 'abort' | 'unknown'> | undefined {
  if (status === 408 || status === 504) return 'timeout';
  if (status === 429) return 'rate_limit';
  if (status !== undefined && status >= 400 && status <= 499) {
    return 'rejection';
  }
  if (status !== undefined && status >= 500 && status <= 599) return 'server';
  return undefined;
}

function classifyTransport(
  chain: readonly Record<string, unknown>[],
): TransportClassification | undefined {
  const host = findSafeHost(chain);
  for (const node of chain) {
    const code = typeof node.code === 'string' ? node.code : undefined;
    const normalizedCode = code?.toUpperCase() ?? '';
    if (TIMEOUT_CODES.has(normalizedCode)) {
      return transportClassification('timeout', 'code', code, host);
    }
    if (CONNECTION_CODES.has(normalizedCode)) {
      return transportClassification('connection', 'code', code, host);
    }
  }
  for (const node of chain) {
    if (nodeHasName(node, TIMEOUT_NAMES)) {
      return transportClassification('timeout', 'name', node.code, host);
    }
    if (nodeHasName(node, CONNECTION_NAMES)) {
      return transportClassification('connection', 'name', node.code, host);
    }
  }
  return undefined;
}

function transportClassification(
  kind: 'connection' | 'timeout',
  evidence: 'code' | 'name',
  code: unknown,
  host: string | undefined,
): TransportClassification {
  return {
    kind,
    evidence,
    transportCode: safeTransportCode(code),
    host,
  };
}

function safeTransportCode(value: unknown): string | undefined {
  const code =
    typeof value === 'number' && Number.isFinite(value) ? String(value) : value;
  return typeof code === 'string' ? safeDiagnostic(code, 128) : undefined;
}

function findSafeHost(
  chain: readonly Record<string, unknown>[],
): string | undefined {
  for (const node of chain) {
    const host = firstString(node.hostname, node.address, node.host);
    const safeHost = safeDiagnostic(host, 256);
    if (safeHost) return safeHost;
  }
  return undefined;
}

function collectCauseChain(root: unknown): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  const queue: unknown[] = [root];
  const seen = new Set<unknown>();

  while (queue.length > 0 && result.length < MAX_CAUSE_CHAIN_NODES) {
    const value = queue.shift();
    const record = asRecord(value);
    if (!record || seen.has(value)) continue;
    seen.add(value);
    result.push(record);
    queue.push(record.cause);
    const nestedErrors = record.errors;
    if (Array.isArray(nestedErrors)) {
      queue.push(...(nestedErrors as unknown[]));
    }
  }
  return result;
}

function nodeHasName(
  node: Record<string, unknown>,
  names: ReadonlySet<string>,
): boolean {
  if (typeof node.name === 'string' && names.has(node.name)) return true;
  const constructorName =
    typeof node.constructor === 'function' ? node.constructor.name : undefined;
  return constructorName !== undefined && names.has(constructorName);
}

function extractUpstreamStatus(
  record: Record<string, unknown> | undefined,
): number | undefined {
  const direct = firstNumber(
    record?.status,
    record?.statusCode,
    record?.status_code,
  );
  if (direct !== undefined) return direct;

  const response = asRecord(record?.response);
  const metadata = asRecord(record?.$metadata);
  return firstNumber(response?.status, metadata?.httpStatusCode);
}

function extractRequestId(
  record: Record<string, unknown> | undefined,
): string | undefined {
  const body = asRecord(read(record, 'error'));
  const nestedBody = asRecord(read(body, 'error'));
  const metadata = asRecord(read(record, '$metadata'));
  const direct = firstString(
    read(record, 'request_id'),
    read(record, 'requestId'),
    read(record, 'requestID'),
    read(record, '_request_id'),
    read(body, 'request_id'),
    read(body, 'requestId'),
    read(nestedBody, 'request_id'),
    read(metadata, 'requestId'),
  );
  return safeRequestId(direct ?? firstRequestIdHeader(headerSources(record)));
}

function extractRetryAfterMs(
  record: Record<string, unknown> | undefined,
): number | undefined {
  const headers = headerSources(record);
  const milliseconds = nonNegativeNumber(
    firstHeader(headers, 'retry-after-ms'),
  );
  if (milliseconds !== undefined) return milliseconds;
  const seconds = nonNegativeNumber(firstHeader(headers, 'retry-after'));
  return seconds === undefined ? undefined : seconds * 1_000;
}

function headerSources(
  record: Record<string, unknown> | undefined,
): Record<string, unknown>[] {
  const response = asRecord(record?.response);
  return [asRecord(response?.headers), asRecord(record?.headers)].filter(
    (headers): headers is Record<string, unknown> => headers !== undefined,
  );
}

function firstRequestIdHeader(
  headers: readonly Record<string, unknown>[],
): string | undefined {
  for (const name of REQUEST_ID_HEADERS) {
    const value = firstString(firstHeader(headers, name));
    if (value) return value;
  }
  return undefined;
}

function firstHeader(
  sources: readonly Record<string, unknown>[],
  name: string,
): unknown {
  for (const source of sources) {
    const value = readHeader(source, name);
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function readHeader(source: Record<string, unknown>, name: string): unknown {
  const get = source.get;
  if (typeof get === 'function') return get.call(source, name);
  const matchingKey = Object.keys(source).find(
    (key) => key.toLowerCase() === name,
  );
  return matchingKey === undefined ? undefined : source[matchingKey];
}

function safeRequestId(value: string | undefined): string | undefined {
  return safeDiagnostic(value, 256);
}

function safeDiagnostic(
  value: string | undefined,
  maxLength: number,
): string | undefined {
  return value && value.length <= maxLength && SAFE_DIAGNOSTIC.test(value)
    ? value
    : undefined;
}

function nonNegativeNumber(value: unknown): number | undefined {
  const parsed =
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : undefined;
}

function read(
  record: Record<string, unknown> | undefined,
  key: string,
): unknown {
  return record?.[key];
}

function firstNumber(...values: unknown[]): number | undefined {
  return values.find((value): value is number => typeof value === 'number');
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
