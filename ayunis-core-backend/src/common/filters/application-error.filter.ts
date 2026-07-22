import { Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { setError } from '@appsignal/nodejs';
import { Request, Response } from 'express';
import { ApplicationError } from '../errors/base.error';

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
    this.reportUnexpectedError(exception);

    if (exception instanceof ApplicationError) {
      this.handleApplicationError(exception, host);
      return;
    }

    // HttpExceptions, raw Errors, and anything else — delegate to NestJS defaults
    super.catch(exception, host);
  }

  private reportUnexpectedError(exception: unknown): void {
    if (exception instanceof ApplicationError && exception.statusCode < 500) {
      return;
    }
    if (exception instanceof HttpException && exception.getStatus() < 500) {
      return;
    }

    // setError requires an Error-like value; wrap non-Error throwables so
    // they still reach AppSignal.
    const error =
      exception instanceof Error ? exception : new Error(String(exception));
    setError(error);
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
