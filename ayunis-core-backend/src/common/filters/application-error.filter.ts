import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApplicationError } from '../errors/base.error';

/**
 * Global exception filter that handles domain-specific ApplicationErrors
 * and converts them to appropriate HTTP responses
 */
@Catch(ApplicationError)
export class ApplicationErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApplicationErrorFilter.name);

  catch(exception: ApplicationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Check if the error has a toHttpException method (like in MessageError)
    if (typeof exception['toHttpException'] === 'function') {
      const httpException = exception['toHttpException']();
      const status = httpException.getStatus();
      const responseBody = httpException.getResponse();

      response.status(status).json({
        ...responseBody,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
      return;
    }

    // Default handling for other ApplicationErrors
    this.logger.error(`Domain error: ${exception.message}`, exception.stack);

    const status = exception.statusCode || 500;
    response.status(status).json({
      code: exception.code,
      message: exception.message,
      ...(exception.metadata && { metadata: exception.metadata }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
