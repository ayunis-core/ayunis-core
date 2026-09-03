import { OpenAIErrorMapper } from './openai-error.mapper';
import { QuotaExceededError } from 'src/iam/quotas/application/quotas.errors';
import { QuotaType } from 'src/iam/quotas/domain/quota-type.enum';
import { CreditBudgetExceededError } from 'src/iam/subscriptions/application/subscription.errors';
import { RateLimitExceededError } from 'src/common/errors/rate-limit-exceeded.error';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { OpenAIModelNotFoundError } from 'src/domain/openai-compat/application/openai-compat.errors';
import { ApplicationError } from 'src/common/errors/base.error';

class UnexpectedOpenAIError extends ApplicationError {
  constructor() {
    super('upstream API returned prompt content', 'UNEXPECTED_OPENAI', 500, {
      prompt: 'confidential prompt',
    });
  }
}

describe('OpenAIErrorMapper', () => {
  const mapper = new OpenAIErrorMapper();

  describe('429 → rate_limit_error (regression for AYC-92 / AYC-78 finding I5)', () => {
    it('maps QuotaExceededError (HTTP 429) to rate_limit_error', () => {
      const result = mapper.toEnvelope(
        new QuotaExceededError(
          QuotaType.FAIR_USE_MESSAGES_MEDIUM,
          100,
          3600_000,
          60,
        ),
      );

      expect(result.status).toBe(429);
      expect(result.body.error.type).toBe('rate_limit_error');
    });

    it('maps CreditBudgetExceededError (HTTP 429) to rate_limit_error', () => {
      const result = mapper.toEnvelope(
        new CreditBudgetExceededError({
          orgId: 'org',
          creditsUsed: 1000,
          monthlyCredits: 500,
        }),
      );

      expect(result.status).toBe(429);
      expect(result.body.error.type).toBe('rate_limit_error');
    });

    it('maps RateLimitExceededError (HTTP 429) to rate_limit_error', () => {
      const result = mapper.toEnvelope(new RateLimitExceededError());

      expect(result.status).toBe(429);
      expect(result.body.error.type).toBe('rate_limit_error');
    });
  });

  describe('domain errors', () => {
    it('maps model-not-found to invalid_request_error 404', () => {
      const result = mapper.toEnvelope(new OpenAIModelNotFoundError('gpt-4o'));
      expect(result.status).toBe(404);
      // 404 falls through to default → invalid_request_error.
      expect(result.body.error.type).toBe('invalid_request_error');
      expect(result.body.error.code).toBe('OPENAI_COMPAT_MODEL_NOT_FOUND');
    });

    it('does not expose a server-error message', () => {
      const result = mapper.toEnvelope(new UnexpectedOpenAIError());

      expect(result.status).toBe(500);
      expect(result.body.error.code).toBe('UNEXPECTED_OPENAI');
      expect(result.body.error.message).toBe('Internal server error');
    });
  });

  describe('HTTP exceptions', () => {
    it.each([
      [new UnauthorizedException(), 401, 'authentication_error'],
      [new ForbiddenException(), 403, 'permission_error'],
      [new BadRequestException('bad'), 400, 'invalid_request_error'],
      [new InternalServerErrorException(), 500, 'server_error'],
    ])('%p → %d / %s', (exception, expectedStatus, expectedType) => {
      const result = mapper.toEnvelope(exception);
      expect(result.status).toBe(expectedStatus);
      expect(result.body.error.type).toBe(expectedType);
    });
  });

  describe('validation errors expose `param` (regression for AYC-132 bug 7)', () => {
    it('populates `param` with the first field from a ValidationPipe BadRequestException', () => {
      const result = mapper.toEnvelope(
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: [{ field: 'messages', constraints: ['arrayMinSize'] }],
        }),
      );
      expect(result.status).toBe(400);
      expect(result.body.error.type).toBe('invalid_request_error');
      expect(result.body.error.code).toBe('VALIDATION_ERROR');
      expect(result.body.error.param).toBe('messages');
      expect(result.body.error.message).toBe('messages: arrayMinSize');
    });

    it('falls back to the generic message shape for non-validation BadRequestException bodies', () => {
      const result = mapper.toEnvelope(new BadRequestException('plain bad'));
      expect(result.body.error.param).toBeNull();
      expect(result.body.error.message).toBe('plain bad');
    });
  });

  describe('unknown errors', () => {
    it('maps plain Error to server_error 500 without echoing the message', () => {
      const result = mapper.toEnvelope(
        new Error('upstream API: prompt content "hidden secret"'),
      );
      expect(result.status).toBe(500);
      expect(result.body.error.type).toBe('server_error');
      // The public message must NOT echo the upstream payload.
      expect(result.body.error.message).toBe('Internal server error');
    });

    it('maps an unknown 5xx-carrying error to server_error 500', () => {
      const result = mapper.toEnvelope(
        httpError(503, 'upstream unavailable', { expose: false }),
      );
      expect(result.status).toBe(500);
      expect(result.body.error.type).toBe('server_error');
      expect(result.body.error.message).toBe('Internal server error');
    });
  });

  // body-parser rejects oversized bodies before routing, so the error never
  // reaches a Nest filter and arrives here as a plain http-errors instance
  // rather than an ApplicationError or HttpException (AYC-553).
  describe('express middleware client errors', () => {
    it('maps body-parser PayloadTooLargeError to 413, not 500', () => {
      const result = mapper.toEnvelope(
        httpError(413, 'request entity too large', {
          name: 'PayloadTooLargeError',
        }),
      );
      expect(result.status).toBe(413);
      expect(result.body.error.type).toBe('invalid_request_error');
      expect(result.body.error.message).toBe('request entity too large');
    });

    it('does not echo the message of a non-exposable client error', () => {
      const result = mapper.toEnvelope(
        httpError(400, 'internal detail: secret', { expose: false }),
      );
      expect(result.status).toBe(400);
      expect(result.body.error.type).toBe('invalid_request_error');
      expect(result.body.error.message).toBe('Bad request');
    });

    it('reads statusCode when status is absent', () => {
      const error = Object.assign(new Error('request entity too large'), {
        statusCode: 413,
        expose: true,
      });
      expect(mapper.toEnvelope(error).status).toBe(413);
    });
  });
});

/** Mirrors the shape the `http-errors` package produces. */
function httpError(
  status: number,
  message: string,
  options: { name?: string; expose?: boolean } = {},
): Error {
  const error = new Error(message);
  error.name = options.name ?? 'HttpError';
  return Object.assign(error, {
    status,
    statusCode: status,
    expose: options.expose ?? status < 500,
  });
}
