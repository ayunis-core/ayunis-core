import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Request, Response } from 'express';
import { ApplicationError } from '../errors/base.error';
import { reportUnexpectedError } from '../errors/report-unexpected-error.helper';

/**
 * Global exception filter that:
 * 1. Converts domain-specific ApplicationErrors to proper HTTP responses
 * 2. Delegates all other exceptions to NestJS's BaseExceptionFilter
 * 3. Reports unexpected errors to AppSignal via setError(). 4xx errors
 *    (ApplicationErrors and HttpExceptions alike) count as expected client
 *    errors and are not reported — they are already captured in structured
 *    logs.
 *
 * Must be registered via APP_FILTER (DI-based) so that BaseExceptionFilter
 * receives the HTTP adapter reference it needs.
 */
@Catch()
export class ApplicationErrorFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    reportUnexpectedError(exception);

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

    const status = exception.toHttpException().getStatus();

    response.status(status).json({
      ...exception.toClientResponse(),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
