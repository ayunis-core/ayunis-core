import { Injectable, Logger, HttpException } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { mappedError } from './openai-error-helpers';
import type { MappedOpenAIError } from './openai-error.types';
import { envelope } from './openai-error-helpers';

@Injectable()
export class OpenAIErrorMapper {
  private readonly logger = new Logger(OpenAIErrorMapper.name);

  /**
   * Convert any thrown value into an OpenAI error envelope. Domain errors
   * carry an HTTP status; HTTP exceptions carry one directly; anything
   * else is treated as a 500 `server_error`.
   */
  toEnvelope(error: unknown): MappedOpenAIError {
    if (error instanceof ApplicationError) {
      const clientResponse = error.toClientResponse();
      return mappedError(
        error.statusCode,
        clientResponse.message,
        clientResponse.code,
      );
    }
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const body = error.getResponse();
      const validation = extractValidationDetails(body);
      if (validation) {
        // Surface the failing field via `param` — OpenAI SDKs use it to
        // attach error UX to the offending input. Constructed message
        // includes the field name so SDK clients without param-aware UX
        // still get an actionable string.
        const message = validation.constraint
          ? `${validation.field}: ${validation.constraint}`
          : `Invalid value for '${validation.field}'`;
        return mappedError(
          status,
          message,
          'VALIDATION_ERROR',
          validation.field,
        );
      }
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string }).message ?? error.message);
      return mappedError(status, message);
    }
    const status = extractStatus(error);
    // Express middleware (body-parser, CORS, Multer) rejects requests before
    // routing, so its errors are plain `http-errors` instances rather than
    // HttpExceptions. Without this branch a 413 would be reported as a 500
    // and SDK clients would retry a permanently failing request (AYC-553).
    if (status !== undefined && status >= 400 && status < 500) {
      return mappedError(status, clientErrorMessage(error, status));
    }
    // Log structurally — never include the raw error object, which can
    // echo prompt fragments from upstream SDKs (AYC-92 redaction sweep).
    this.logger.error('Unhandled error in OpenAI-compat path', { status });
    return {
      status: 500,
      body: envelope({
        message: 'Internal server error',
        type: 'server_error',
      }),
    };
  }
}

/**
 * `http-errors` sets `expose` to true for client errors whose message is safe
 * to return. Anything else falls back to the status' generic reason so an
 * internal detail is never echoed to the caller.
 */
function clientErrorMessage(error: unknown, status: number): string {
  const { expose, message } = error as { expose?: unknown; message?: unknown };
  if (expose === true && typeof message === 'string' && message.length > 0) {
    return message;
  }
  return status === 413 ? 'Request entity too large' : 'Bad request';
}

function extractStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const maybeStatus = (error as { status?: unknown }).status;
  if (typeof maybeStatus === 'number') return maybeStatus;
  const maybeStatusCode = (error as { statusCode?: unknown }).statusCode;
  if (typeof maybeStatusCode === 'number') return maybeStatusCode;
  const maybeResponse = (error as { response?: { status?: unknown } }).response;
  if (
    maybeResponse &&
    typeof maybeResponse === 'object' &&
    typeof maybeResponse.status === 'number'
  ) {
    return maybeResponse.status;
  }
  return undefined;
}

interface ValidationDetails {
  field: string;
  constraint?: string;
}

/**
 * Recognises the shape produced by main.ts's ValidationPipe exceptionFactory:
 * `{ code: 'VALIDATION_ERROR', message, errors: [{ field, constraints }] }`.
 * Returns the first failing field so the OpenAI envelope can populate `param`
 * (otherwise it would always be null, which SDKs can't attach UX to).
 */
function extractValidationDetails(body: unknown): ValidationDetails | null {
  if (typeof body !== 'object' || body === null) return null;
  const obj = body as {
    code?: unknown;
    errors?: unknown;
  };
  if (obj.code !== 'VALIDATION_ERROR') return null;
  if (!Array.isArray(obj.errors) || obj.errors.length === 0) return null;
  const first = obj.errors[0] as { field?: unknown; constraints?: unknown };
  if (typeof first.field !== 'string') return null;
  const constraint =
    Array.isArray(first.constraints) && typeof first.constraints[0] === 'string'
      ? first.constraints[0]
      : undefined;
  return { field: first.field, constraint };
}
