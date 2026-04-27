import type { HttpException } from '@nestjs/common';
import type { ApplicationError } from 'src/common/errors/base.error';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  AmbiguousModelNameError,
  ModelNotFoundByIdError,
  ModelNotFoundByNameError,
} from '../../../../application/models.errors';
import type {
  ErrorType,
  Mapped,
  OpenAIErrorEnvelope,
} from './openai-error.types';

const DOMAIN_RULES: ReadonlyArray<{
  match: (e: unknown) => boolean;
  status: number;
  type: ErrorType;
  code: string;
}> = [
  {
    match: (e) =>
      e instanceof ModelNotFoundByIdError ||
      e instanceof ModelNotFoundByNameError,
    status: 404,
    type: 'invalid_request_error',
    code: 'model_not_found',
  },
  {
    match: (e) => e instanceof AmbiguousModelNameError,
    status: 400,
    type: 'invalid_request_error',
    code: 'model_name_ambiguous',
  },
  {
    match: (e) => e instanceof UnauthorizedAccessError,
    status: 401,
    type: 'authentication_error',
    code: 'unauthorized',
  },
];

export function tryDomainError(error: unknown): Mapped | undefined {
  if (!(error instanceof Error)) return undefined;
  const rule = DOMAIN_RULES.find((r) => r.match(error));
  if (!rule) return undefined;
  return {
    status: rule.status,
    body: envelope(rule.type, rule.code, error.message),
  };
}

export function fromHttpException(error: HttpException): Mapped {
  const status = error.getStatus();
  const message = extractMessage(error.getResponse());
  return {
    status,
    body: envelope(statusToType(status), undefined, message),
  };
}

export function fromApplicationError(error: ApplicationError): Mapped {
  return {
    status: error.statusCode,
    body: envelope(statusToType(error.statusCode), error.code, error.message),
  };
}

export function statusToType(status: number): ErrorType {
  if (status === 401) return 'authentication_error';
  if (status === 403) return 'permission_error';
  if (status >= 500) return 'server_error';
  return 'invalid_request_error';
}

export function envelope(
  type: ErrorType,
  code: string | undefined,
  message: string,
): OpenAIErrorEnvelope {
  return {
    error: {
      type,
      ...(code ? { code } : {}),
      message,
    },
  };
}

export function extractMessage(response: string | object): string {
  if (typeof response === 'string') return response;
  const r = response as { message?: unknown };
  if (typeof r.message === 'string') return r.message;
  if (Array.isArray(r.message)) return r.message.join('; ');
  return 'Request failed';
}
