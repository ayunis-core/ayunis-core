import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { Request, Response } from 'express';
import { ApplicationError } from '../errors/base.error';

/**
 * Global exception filter that:
 * 1. Converts domain-specific ApplicationErrors to proper HTTP responses
 * 2. Delegates all other exceptions to NestJS's BaseExceptionFilter
 * 3. Reports unexpected errors to Sentry via @SentryExceptionCaptured()
 *
 * Must be registered via APP_FILTER (DI-based) so that BaseExceptionFilter
 * receives the HTTP adapter reference it needs.
 */
@Catch()
export class ApplicationErrorFilter extends BaseExceptionFilter {
  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof ApplicationError) {
      this.handleApplicationError(exception, host);
      return;
    }

    // HttpExceptions, raw Errors, and anything else — delegate to NestJS defaults
    super.catch(exception, host);
  }

  private handleApplicationError(
    exception: ApplicationError,
    host: ArgumentsHost,
  ): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const httpException = exception.toHttpException();
    const status = httpException.getStatus();
    const responseBody = httpException.getResponse();

    if (responseBody instanceof Object) {
      response.status(status).json({
        ...responseBody,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    } else {
      response.status(status).json({
        code: exception.code,
        message: exception.message,
        ...(exception.metadata && { metadata: exception.metadata }),
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }
}
