import type {
  StreamInferenceHandler,
  StreamInferenceInput,
} from '../../application/ports/stream-inference.handler';
import {
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from '../../application/ports/stream-inference.handler';
import type { Subscriber } from 'rxjs';
import { Observable } from 'rxjs';
import type Anthropic from '@anthropic-ai/sdk';
import { Logger } from '@nestjs/common';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import type { MessageCreateParamsStreaming } from '@anthropic-ai/sdk/resources/messages';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { AnthropicMessageConverter } from '../converters/anthropic-message.converter';

// Type for Anthropic-compatible clients (Anthropic SDK and Bedrock SDK)
type AnthropicCompatibleClient = {
  messages: {
    create: Anthropic['messages']['create'];
  };
};

export abstract class BaseAnthropicStreamInferenceHandler
  implements StreamInferenceHandler
{
  private readonly logger = new Logger(
    BaseAnthropicStreamInferenceHandler.name,
  );
  protected client: AnthropicCompatibleClient;
  protected readonly converter: AnthropicMessageConverter;

  constructor(protected readonly imageContentService: ImageContentService) {
    this.converter = new AnthropicMessageConverter(imageContentService);
  }

  answer(
    input: StreamInferenceInput,
  ): Observable<StreamInferenceResponseChunk> {
    return new Observable<StreamInferenceResponseChunk>((subscriber) => {
      void this.streamResponse(input, subscriber);
    });
  }

  private async streamResponse(
    input: StreamInferenceInput,
    subscriber: Subscriber<StreamInferenceResponseChunk>,
  ): Promise<void> {
    try {
      const { messages, tools, toolChoice, systemPrompt, orgId } = input;
      const anthropicTools = tools.map((t) => this.converter.convertTool(t));
      const anthropicMessages = await this.converter.convertMessages(
        messages,
        orgId,
      );
      const anthropicToolChoice = toolChoice
        ? this.converter.convertToolChoice(toolChoice)
        : undefined;

      const completionOptions: MessageCreateParamsStreaming = {
        model: input.model.name,
        system: systemPrompt,
        messages: anthropicMessages,
        tools: anthropicTools,
        tool_choice: anthropicToolChoice,
        max_tokens: 10000,
        stream: true,
      };

      this.logger.debug('completionOptions', completionOptions);

      const completionFn = () => this.client.messages.create(completionOptions);

      const response = await retryWithBackoff({
        fn: completionFn,
        maxRetries: 3,
        delay: 1000,
      });

      for await (const chunk of response) {
        const delta = this.convertChunk(chunk);
        if (delta) {
          subscriber.next(delta);
        }
      }

      subscriber.complete();
    } catch (error) {
      subscriber.error(error);
    }
  }

  protected convertChunk = (
    chunk: Anthropic.Messages.MessageStreamEvent,
  ): StreamInferenceResponseChunk | null => {
    if (chunk.type === 'content_block_delta')
      return this.convertContentBlockDelta(chunk);
    if (chunk.type === 'content_block_start')
      return this.convertContentBlockStart(chunk);
    if (chunk.type === 'message_start') return this.convertMessageStart(chunk);
    if (chunk.type === 'message_delta') return this.convertMessageDelta(chunk);
    return null;
  };

  private convertContentBlockDelta(
    chunk: Anthropic.Messages.ContentBlockDeltaEvent,
  ): StreamInferenceResponseChunk | null {
    if (chunk.delta.type === 'thinking_delta')
      return StreamInferenceResponseChunk.thinking(chunk.delta.thinking);
    if (chunk.delta.type === 'signature_delta') {
      return new StreamInferenceResponseChunk({
        thinkingDelta: null,
        thinkingSignature: chunk.delta.signature,
        textContentDelta: null,
        toolCallsDelta: [],
      });
    }
    if (chunk.delta.type === 'text_delta')
      return StreamInferenceResponseChunk.text(chunk.delta.text);
    if (chunk.delta.type === 'input_json_delta') {
      return new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: null,
        toolCallsDelta: [
          new StreamInferenceResponseChunkToolCall({
            index: chunk.index,
            id: null,
            name: null,
            argumentsDelta: chunk.delta.partial_json,
          }),
        ],
      });
    }
    return null;
  }

  private convertContentBlockStart(
    chunk: Anthropic.Messages.ContentBlockStartEvent,
  ): StreamInferenceResponseChunk | null {
    if (chunk.content_block.type === 'thinking') return null;
    if (chunk.content_block.type === 'tool_use') {
      return new StreamInferenceResponseChunk({
        thinkingDelta: null,
        textContentDelta: null,
        toolCallsDelta: [
          new StreamInferenceResponseChunkToolCall({
            index: chunk.index,
            id: chunk.content_block.id,
            name: chunk.content_block.name,
            argumentsDelta: null,
          }),
        ],
      });
    }
    return null;
  }

  private convertMessageStart(
    chunk: Anthropic.Messages.MessageStartEvent,
  ): StreamInferenceResponseChunk {
    const usage = chunk.message.usage;
    return new StreamInferenceResponseChunk({
      thinkingDelta: null,
      textContentDelta: null,
      toolCallsDelta: [],
      usage: { inputTokens: usage.input_tokens, outputTokens: undefined },
    });
  }

  private convertMessageDelta(
    chunk: Anthropic.Messages.MessageDeltaEvent,
  ): StreamInferenceResponseChunk {
    return new StreamInferenceResponseChunk({
      thinkingDelta: null,
      textContentDelta: null,
      toolCallsDelta: [],
      usage: {
        inputTokens: undefined,
        outputTokens: chunk.usage.output_tokens,
      },
    });
  }
}
