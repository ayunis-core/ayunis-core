import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApplicationError } from '../errors/base.error';
import * as Sentry from '@sentry/nestjs';
import { ClsServiceManager } from 'nestjs-cls';
import { MyClsStore } from '../context/services/context.service';

/**
 * Global exception filter that handles domain-specific ApplicationErrors
 * and converts them to appropriate HTTP responses.
 *
 * Enriches Sentry error reports with:
 * - User context (userId, orgId, role)
 * - Request context (path, method, body, params, query)
 * - Error metadata (code, custom metadata)
 */
@Catch(ApplicationError)
export class ApplicationErrorFilter implements ExceptionFilter {
  catch(exception: ApplicationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Capture exception with enriched context
    this.captureToSentry(exception, request);

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

  private captureToSentry(exception: ApplicationError, request: Request) {
    Sentry.withScope((scope) => {
      // Add user context from CLS store
      const cls = ClsServiceManager.getClsService<MyClsStore>();
      const userId = cls?.get('userId');
      const orgId = cls?.get('orgId');
      const role = cls?.get('role');

      if (userId) {
        scope.setUser({
          id: userId,
          orgId: orgId as string | undefined,
          role: role as string | undefined,
        });
      }

      // Add request context as tags for filtering
      scope.setTag('path', request.path);
      scope.setTag('method', request.method);
      scope.setTag('errorCode', exception.code);

      // Add request details as extra context
      scope.setExtra('requestBody', this.sanitizeBody(request.body));
      scope.setExtra('requestParams', request.params);
      scope.setExtra('requestQuery', request.query);
      scope.setExtra('errorMetadata', exception.metadata);

      Sentry.captureException(exception);
    });
  }

  /**
   * Sanitize request body to avoid capturing sensitive data
   */
  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;

    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'api_key'];
    const sanitized = { ...body } as Record<string, unknown>;

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
