import { Injectable } from '@nestjs/common';
import {
  InferenceHandler,
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text.message-content.entity';

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
 * @see InferenceHandlerRegistry.getHandler() - Routing logic
 * @see MockStreamInferenceHandler - Streaming equivalent
 */
@Injectable()
export class MockInferenceHandler extends InferenceHandler {
  answer(input: InferenceInput): Promise<InferenceResponse> {
    return Promise.resolve(
      new InferenceResponse(
        [
          new TextMessageContent(
            `${input.model.provider}::${input.model.name}`,
          ),
        ],
        {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
      ),
    );
  }
}
