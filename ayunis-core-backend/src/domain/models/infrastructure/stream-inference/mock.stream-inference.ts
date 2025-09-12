import {
  StreamInferenceHandler,
  StreamInferenceInput,
} from '../../application/ports/stream-inference.handler';
import { StreamInferenceResponseChunk } from '../../application/ports/stream-inference.handler';
import { Observable } from 'rxjs';
import { of } from 'rxjs';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MockStreamInferenceHandler extends StreamInferenceHandler {
  answer(
    input: StreamInferenceInput,
  ): Observable<StreamInferenceResponseChunk> {
    const chunk = new StreamInferenceResponseChunk({
      textContentDelta: `${input.model.provider}::${input.model.name}`,
      toolCallsDelta: [],
    });
    return of(chunk);
  }
}
