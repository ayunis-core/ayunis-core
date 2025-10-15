import { Injectable } from '@nestjs/common';
import {
  InferenceHandler,
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';

/**
 * Mock inference handler for testing environments.
 *
 * This handler is automatically used when NODE_ENV=test, replacing all real
 * LLM provider handlers (OpenAI, Anthropic, Mistral, etc.). It enables:
 * - Fast, deterministic test execution
 * - No external API calls or network dependencies
 * - No API keys required
 * - Zero cost test runs
 *
 * Response format: "{provider}::{model}" (e.g., "openai::gpt-4o-mini")
 * This format allows tests to verify the correct model was selected without
 * making actual API calls.
 *
 * For chat naming requests (containing "Name this chat"), includes the
 * requested name in the response to simulate proper chat naming behavior.
 *
 * @see InferenceHandlerRegistry.getHandler() - Routing logic
 * @see MockStreamInferenceHandler - Streaming equivalent
 */
@Injectable()
export class MockInferenceHandler extends InferenceHandler {
  answer(input: InferenceInput): Promise<InferenceResponse> {
    // Extract the last user message to check for naming requests
    const lastUserMessage = input.messages
      .filter((m) => m.role === MessageRole.USER)
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

    return Promise.resolve(
      new InferenceResponse([new TextMessageContent(responseText)], {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      }),
    );
  }
}
