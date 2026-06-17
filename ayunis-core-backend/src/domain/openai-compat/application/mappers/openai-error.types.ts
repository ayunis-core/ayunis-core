/**
 * Discriminator union for OpenAI's error envelope. The OpenAI SDK keys
 * retry logic off `error.type`: `'rate_limit_error'` and `'server_error'`
 * are retried, others are surfaced to the caller.
 *
 * AYC-92 bug fix: the previous attempt mapped 429 → `'invalid_request_error'`
 * (the default), which broke SDK retry on rate-limit / quota / credit-budget
 * errors. 429 now maps to `'rate_limit_error'`.
 */
export type OpenAIErrorType =
  | 'invalid_request_error'
  | 'authentication_error'
  | 'permission_error'
  | 'rate_limit_error'
  | 'server_error';

export interface OpenAIErrorEnvelope {
  error: {
    message: string;
    type: OpenAIErrorType;
    code: string | null;
    param: string | null;
  };
}

export interface MappedOpenAIError {
  status: number;
  body: OpenAIErrorEnvelope;
}
