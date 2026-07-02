import { ArgumentsHost, Catch, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request, Response } from 'express';
import { OpenAIErrorMapper } from '../../../application/mappers/openai-error.mapper';
import { ApplicationErrorFilter } from 'src/common/filters/application-error.filter';

/**
 * Wraps OpenAI-compat exceptions into the OpenAI error envelope. Registered
 * globally so it can intercept errors raised BEFORE the controller dispatch
 * (e.g. JSON body-parse failures from Nest's body parser) — those skip
 * controller-scoped `@UseFilters` entirely.
 *
 * Errors for any other path are delegated to `ApplicationErrorFilter`, NOT
 * `super.catch`: as a `@Catch()` global filter registered after
 * `ApplicationErrorFilter`, this filter wins the (last-registered-first)
 * global filter selection for EVERY route, so falling back to `super.catch`
 * (NestJS's terminal default handler) would strip the `code` field from all
 * domain error responses app-wide — the frontend switches on `code` to show
 * specific error messages.
 *
 * Two response paths:
 * - Pre-stream errors (`response.headersSent === false`): write the
 *   envelope as a JSON body with the mapped HTTP status.
 * - Mid-stream errors (`response.headersSent === true`): the SSE response
 *   has already started — we can only emit a final `data:` frame
 *   carrying the envelope and close the connection. The status code is
 *   already committed.
 */
@Catch()
export class OpenAIExceptionFilter extends BaseExceptionFilter {
  private readonly openaiCompatLogger = new Logger(OpenAIExceptionFilter.name);

  constructor(
    private readonly errorMapper: OpenAIErrorMapper,
    private readonly applicationErrorFilter: ApplicationErrorFilter,
  ) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    if (!this.isOpenAICompatRequest(request)) {
      // Not ours — hand over to the app-wide domain error handling.
      this.applicationErrorFilter.catch(exception, host);
      return;
    }

    const response = ctx.getResponse<Response>();
    const mapped = this.errorMapper.toEnvelope(exception);

    if (response.headersSent) {
      // SSE is open — can't change status; emit a final data frame.
      try {
        response.write(`data: ${JSON.stringify(mapped.body)}\n\n`);
        response.write('data: [DONE]\n\n');
        response.end();
      } catch (writeError) {
        this.openaiCompatLogger.warn('Failed to emit final SSE error frame', {
          status: mapped.status,
          writeError:
            writeError instanceof Error ? writeError.message : 'Unknown',
        });
      }
      return;
    }

    response.status(mapped.status).json(mapped.body);
  }

  private isOpenAICompatRequest(request: Request): boolean {
    // Match the global '/api' prefix + the controller's
    // 'openai-compat/v1/chat' route. Use startsWith so query strings and
    // future sub-routes are caught too.
    return request.url.startsWith('/api/openai-compat/');
  }
}
