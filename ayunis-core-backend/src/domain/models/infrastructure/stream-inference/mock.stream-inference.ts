import {
  StreamInferenceHandler,
  StreamInferenceInput,
} from '../../application/ports/stream-inference.handler';
import { StreamInferenceResponseChunk } from '../../application/ports/stream-inference.handler';
import { Observable } from 'rxjs';
import { of } from 'rxjs';
import { Injectable } from '@nestjs/common';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text.message-content.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';

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
 * For chat naming requests (containing "Name this chat"), includes the
 * requested name in the response to simulate proper chat naming behavior.
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
    // Extract the last user message to check for naming requests
    const lastUserMessage = input.messages
      .filter(m => m.role === 'user')
      .pop();

    let responseText = `${input.model.provider}::${input.model.name}`;

    // Handle chat naming requests for tests
    if (lastUserMessage?.content && lastUserMessage.content.length > 0) {
      const firstContent = lastUserMessage.content[0];
      let textContent = '';

      // Check if it's a TextMessageContent
      if (firstContent.type === MessageContentType.TEXT) {
        textContent = (firstContent as TextMessageContent).text;
      }

      // Check if this is a naming request
      const namingMatch = textContent.match(/Name this chat (\S+)/i);
      if (namingMatch) {
        // Include the requested name in the response
        const requestedName = namingMatch[1];
        responseText = `I'll name this chat ${requestedName}. You're talking to ${input.model.provider}::${input.model.name}`;
      }
    }

    const chunk = new StreamInferenceResponseChunk({
      textContentDelta: responseText,
      toolCallsDelta: [],
    });
    return of(chunk);
  }
}
