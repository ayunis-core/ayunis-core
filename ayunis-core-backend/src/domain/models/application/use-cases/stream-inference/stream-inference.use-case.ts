import { Observable, catchError, throwError } from 'rxjs';
import { Injectable, Logger } from '@nestjs/common';
import { StreamInferenceHandlerRegistry } from '../../registry/stream-inference-handler.registry';
import {
  StreamInferenceHandler,
  StreamInferenceInput,
} from '../../ports/stream-inference.handler';
import { StreamInferenceResponseChunk } from '../../ports/stream-inference.handler';
import { Model } from 'src/domain/models/domain/model.entity';
import {
  InferenceAbortedError,
  InferenceFailedError,
} from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { extractUpstreamStatus } from '../../helpers/extract-upstream-status.helper';

@Injectable()
export class StreamInferenceUseCase {
  private readonly logger = new Logger(StreamInferenceUseCase.name);
  constructor(
    private readonly streamInferenceRegistry: StreamInferenceHandlerRegistry,
  ) {}

  execute(
    input: StreamInferenceInput,
  ): Observable<StreamInferenceResponseChunk> {
    try {
      return this.getHandler(input.model)
        .answer(input)
        .pipe(
          catchError((error: unknown) =>
            throwError(() => this.handleInferenceError(error, input)),
          ),
        );
    } catch (error) {
      throw this.handleInferenceError(error, input);
    }
  }

  private handleInferenceError(
    error: unknown,
    input: StreamInferenceInput,
  ): Error {
    if (error instanceof ApplicationError) return error;
    if (isAbortError(error)) {
      this.logger.log('Streaming inference aborted by client', {
        model: input.model.name,
        provider: input.model.provider,
      });
      return new InferenceAbortedError();
    }
    const status = extractUpstreamStatus(error);
    this.logger.error('Provider stream inference failed', {
      model: input.model.name,
      provider: input.model.provider,
      messageCount: input.messages.length,
      toolCount: input.tools.length,
      toolChoice: input.toolChoice,
      errorName: error instanceof Error ? error.name : 'Unknown',
      status,
    });
    return new InferenceFailedError('Provider inference failed', { status });
  }

  private getHandler(model: Model): StreamInferenceHandler {
    return this.streamInferenceRegistry.getHandler(model.provider);
  }
}

// Undici fetch aborts surface as DOMException named AbortError; some provider
// SDKs throw plain Errors with the same name. DOMException is checked
// separately because it does not reliably pass `instanceof Error` across
// realms (e.g. under Jest's sandboxed globals).
function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error || error instanceof DOMException) &&
    error.name === 'AbortError'
  );
}
