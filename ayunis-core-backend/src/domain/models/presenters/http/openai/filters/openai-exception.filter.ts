import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { OpenAIErrorMapper } from '../mappers/openai-error.mapper';

@Catch()
export class OpenAIExceptionFilter implements ExceptionFilter {
  constructor(private readonly mapper: OpenAIErrorMapper) {}

  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    // The streaming path writes the error envelope into the SSE body itself
    // (headers are flushed before the subscription starts). Once headers are
    // out, we can only close the connection — Express won't let us rewrite
    // the response.
    if (response.headersSent) {
      if (!response.writableEnded) response.end();
      return;
    }
    const { status, body } = this.mapper.toEnvelope(error);
    response.status(status).json(body);
  }
}
