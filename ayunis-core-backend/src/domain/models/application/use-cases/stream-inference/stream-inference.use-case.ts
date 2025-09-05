import { Observable } from 'rxjs';
import { Injectable, Logger } from '@nestjs/common';
import { StreamInferenceHandlerRegistry } from '../../registry/stream-inference-handler.registry';
import {
  StreamInferenceHandler,
  StreamInferenceInput,
} from '../../ports/stream-inference.handler';
import { StreamInferenceResponseChunk } from '../../ports/stream-inference.handler';
import { Model } from 'src/domain/models/domain/model.entity';
import { InferenceFailedError } from '../../models.errors';
import { ApplicationError } from 'src/common/errors/base.error';

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
      return this.getHandler(input.model).answer(input);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Stream inference failed', {
        error: error as Error,
        input: input,
      });
      throw new InferenceFailedError(
        error instanceof Error ? error.message : 'Unknown error',
        {
          error: error as Error,
        },
      );
    }
  }

  private getHandler(model: Model): StreamInferenceHandler {
    return this.streamInferenceRegistry.getHandler(model.provider);
  }
}
