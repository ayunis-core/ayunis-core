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
      return mappedError(error.statusCode, error.message, error.code);
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
    // Log structurally — never include the raw error object, which can
    // echo prompt fragments from upstream SDKs (AYC-92 redaction sweep).
    this.logger.error('Unhandled error in OpenAI-compat path', {
      status: extractStatus(error),
    });
    return {
      status: 500,
      body: envelope({
        message: 'Internal server error',
        type: 'server_error',
      }),
    };
  }
}

function extractStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const maybeStatus = (error as { status?: unknown }).status;
  if (typeof maybeStatus === 'number') return maybeStatus;
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
