import { Observable } from 'rxjs';
import { Injectable } from '@nestjs/common';
import { StreamInferenceHandlerRegistry } from '../../registry/stream-inference-handler.registry';
import {
  StreamInferenceHandler,
  StreamInferenceInput,
} from '../../ports/stream-inference.handler';
import { StreamInferenceResponseChunk } from '../../ports/stream-inference.handler';
import { Model } from 'src/domain/models/domain/model.entity';

@Injectable()
export class StreamInferenceUseCase {
  constructor(
    private readonly streamInferenceRegistry: StreamInferenceHandlerRegistry,
  ) {}

  execute(
    input: StreamInferenceInput,
  ): Observable<StreamInferenceResponseChunk> {
    return this.getHandler(input.model).answer(input);
  }

  private getHandler(model: Model): StreamInferenceHandler {
    return this.streamInferenceRegistry.getHandler(model.provider);
  }
}
