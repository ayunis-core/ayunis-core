import {
  StreamInferenceHandler,
  StreamInferenceInput,
} from '../../application/ports/stream-inference.handler';
import { StreamInferenceResponseChunk } from '../../application/ports/stream-inference.handler';
import { Observable } from 'rxjs';
import { of } from 'rxjs';
import { Injectable } from '@nestjs/common';

/**
 * Mock streaming inference handler for testing environments.
 *
 * This handler is automatically used when NODE_ENV=test, replacing all real
 * LLM provider streaming handlers. It enables:
 * - Fast, deterministic test execution for streaming endpoints
 * - No external API calls or network dependencies
 * - No API keys required
 * - Zero cost test runs
 *
 * Response format: Single chunk with "{provider}::{model}" text
 * (e.g., "openai::gpt-4o-mini")
 *
 * Unlike real streaming handlers that emit multiple chunks over time,
 * this mock emits a single chunk immediately using RxJS `of()` operator.
 *
 * @see StreamInferenceHandlerRegistry.getHandler() - Routing logic
 * @see MockInferenceHandler - Non-streaming equivalent
 */
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
