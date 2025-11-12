import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApplicationError } from '../errors/base.error';
import * as Sentry from '@sentry/nestjs';

/**
 * Global exception filter that handles domain-specific ApplicationErrors
 * and converts them to appropriate HTTP responses
 */
@Catch(ApplicationError)
export class ApplicationErrorFilter implements ExceptionFilter {
  catch(exception: ApplicationError, host: ArgumentsHost) {
    Sentry.captureException(exception);
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
    return;
  }
}
