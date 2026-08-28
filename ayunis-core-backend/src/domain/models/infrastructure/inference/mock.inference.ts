import { Injectable } from '@nestjs/common';
import {
  InferenceHandler,
  InferenceInput,
  InferenceResponse,
} from 'src/domain/models/application/ports/inference.handler';
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
 * The E2E inline-document trigger echoes extracted file content so retrieval
 * journeys can assert what reached inference without a real model.
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

    if (lastUserMessage?.content && lastUserMessage.content.length > 0) {
      const textContents = lastUserMessage.content
        .filter(
          (content): content is TextMessageContent =>
            content.type === MessageContentType.TEXT,
        )
        .map((content) => content.text);
      const namingMatch = /Name this chat (\S+)/i.exec(textContents[0] ?? '');
      if (namingMatch) {
        const requestedName = namingMatch[1];
        responseText = `I'll name this chat ${requestedName}. You're talking to ${input.model.provider}::${input.model.name}`;
      }
      if (
        textContents.some((text) => text.includes(ECHO_INLINE_DOCUMENT_PROMPT))
      ) {
        responseText =
          textContents.find((text) => text.startsWith('[Document:')) ??
          responseText;
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

const ECHO_INLINE_DOCUMENT_PROMPT = 'E2E echo extracted inline document';
