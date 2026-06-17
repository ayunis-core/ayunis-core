/**
 * Known inference error types used as Prometheus `error_type` label values.
 */
export type InferenceErrorType =
  | 'timeout'
  | 'rate_limit'
  | 'server_error'
  | 'auth_error'
  | 'context_length'
  | 'content_policy'
  | 'connection_error'
  | 'unknown';

/**
 * Extracts a numeric status code from a structured error object.
 * Provider SDKs (OpenAI, Anthropic) attach `status` or `code` properties.
 */
function extractStatusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const record = error as Record<string, unknown>;
  if (typeof record['status'] === 'number') return record['status'];
  if (typeof record['code'] === 'number') return record['code'];
  return undefined;
}

interface StatusRule {
  test: (status: number) => boolean;
  category: InferenceErrorType;
}

const STATUS_RULES: StatusRule[] = [
  { test: (s) => s === 401 || s === 403, category: 'auth_error' },
  { test: (s) => s === 408 || s === 504, category: 'timeout' },
  { test: (s) => s === 429, category: 'rate_limit' },
  {
    test: (s) => s === 500 || s === 502 || s === 503,
    category: 'server_error',
  },
];

interface MessageRule {
  test: (msg: string) => boolean;
  category: InferenceErrorType;
}

const MESSAGE_RULES: MessageRule[] = [
  {
    test: (m) => m.includes('timeout') || m.includes('timed out'),
    category: 'timeout',
  },
  {
    test: (m) => m.includes('rate') && m.includes('limit'),
    category: 'rate_limit',
  },
  {
    test: (m) => /\b500\b/.test(m) || /\b502\b/.test(m) || /\b503\b/.test(m),
    category: 'server_error',
  },
  { test: (m) => /\b408\b/.test(m) || /\b504\b/.test(m), category: 'timeout' },
  {
    test: (m) => /\b401\b/.test(m) || /\b403\b/.test(m),
    category: 'auth_error',
  },
  {
    test: (m) =>
      m.includes('context length') ||
      m.includes('context_length') ||
      m.includes('too many tokens') ||
      m.includes('maximum context'),
    category: 'context_length',
  },
  {
    test: (m) =>
      m.includes('content policy') ||
      m.includes('content_policy') ||
      m.includes('content filter') ||
      m.includes('content moderation'),
    category: 'content_policy',
  },
  {
    test: (m) => m.includes('econnrefused') || m.includes('econnreset'),
    category: 'connection_error',
  },
];

/**
 * Extracts a message string from a structured error object.
 * Handles both Error instances and plain objects with a `message` property.
 */
function extractMessage(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (typeof error !== 'object' || error === null) return undefined;
  if (!('message' in error)) return undefined;
  const msg = (error as Record<string, unknown>)['message'];
  return typeof msg === 'string' ? msg : undefined;
}

/**
 * Classifies an inference error into a Prometheus-friendly error_type label.
 */
export function classifyInferenceError(error: unknown): InferenceErrorType {
  const status = extractStatusCode(error);
  if (status !== undefined) {
    const statusMatch = STATUS_RULES.find((r) => r.test(status));
    if (statusMatch) return statusMatch.category;
  }

  const rawMessage = extractMessage(error);
  if (rawMessage === undefined) return 'unknown';
  const message = rawMessage.toLowerCase();

  return MESSAGE_RULES.find((r) => r.test(message))?.category ?? 'unknown';
}
