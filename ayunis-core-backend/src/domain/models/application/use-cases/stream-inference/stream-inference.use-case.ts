import { Observable, catchError, throwError } from 'rxjs';
import { Injectable } from '@nestjs/common';
import { BaseUseCase } from 'src/common/use-case/base-use-case';
import { StreamInferenceHandlerRegistry } from '../../registry/stream-inference-handler.registry';
import {
  StreamInferenceHandler,
  StreamInferenceInput,
} from '../../ports/stream-inference.handler';
import { StreamInferenceResponseChunk } from '../../ports/stream-inference.handler';
import { Model } from 'src/domain/models/domain/model.entity';
import { InferenceFailedError } from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';
import { extractUpstreamStatus } from '../../helpers/extract-upstream-status.helper';

@Injectable()
export class StreamInferenceUseCase extends BaseUseCase {
  constructor(
    private readonly streamInferenceRegistry: StreamInferenceHandlerRegistry,
  ) {
    super();
  }

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
