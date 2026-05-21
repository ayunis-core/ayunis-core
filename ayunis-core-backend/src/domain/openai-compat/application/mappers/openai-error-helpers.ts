import type {
  MappedOpenAIError,
  OpenAIErrorEnvelope,
  OpenAIErrorType,
} from './openai-error.types';

export function envelope(params: {
  message: string;
  type: OpenAIErrorType;
  code?: string | null;
  param?: string | null;
}): OpenAIErrorEnvelope {
  return {
    error: {
      message: params.message,
      type: params.type,
      code: params.code ?? null,
      param: params.param ?? null,
    },
  };
}

/**
 * HTTP status → OpenAI error type mapping.
 *
 * AYC-92 bug fix: 429 → `'rate_limit_error'`. The previous attempt let
 * 429 fall through to `'invalid_request_error'`, breaking OpenAI SDK
 * retry semantics for rate-limit / quota / credit-budget errors.
 */
export function statusToType(status: number): OpenAIErrorType {
  if (status === 401) return 'authentication_error';
  if (status === 403) return 'permission_error';
  if (status === 429) return 'rate_limit_error';
  if (status >= 500) return 'server_error';
  return 'invalid_request_error';
}

export function mappedError(
  status: number,
  message: string,
  code?: string | null,
  param?: string | null,
): MappedOpenAIError {
  return {
    status,
    body: envelope({ message, type: statusToType(status), code, param }),
  };
}
