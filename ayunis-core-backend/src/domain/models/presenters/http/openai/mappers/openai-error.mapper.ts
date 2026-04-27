import { Injectable, Logger, HttpException } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { Mapped, OpenAIErrorEnvelope } from './openai-error.types';
import {
  envelope,
  fromApplicationError,
  fromHttpException,
  tryDomainError,
} from './openai-error-helpers';

export type { OpenAIErrorEnvelope };

@Injectable()
export class OpenAIErrorMapper {
  private readonly logger = new Logger(OpenAIErrorMapper.name);

  toEnvelope(error: unknown): Mapped {
    const domain = tryDomainError(error);
    if (domain) return domain;
    if (error instanceof HttpException) return fromHttpException(error);
    if (error instanceof ApplicationError) return fromApplicationError(error);

    this.logger.error('Unhandled error reaching OpenAI error mapper', error);
    return {
      status: 500,
      body: envelope(
        'server_error',
        'internal_error',
        'An unexpected error occurred',
      ),
    };
  }
}
