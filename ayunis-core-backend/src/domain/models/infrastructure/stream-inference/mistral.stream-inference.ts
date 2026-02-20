import {
  StreamInferenceHandler,
  StreamInferenceInput,
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from '../../application/ports/stream-inference.handler';
import { Observable, Subscriber } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { Mistral } from '@mistralai/mistralai';
import { Logger, Injectable } from '@nestjs/common';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import {
  ChatCompletionStreamRequest,
  CompletionEvent,
} from '@mistralai/mistralai/models/components';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { MistralMessageConverter } from '../converters/mistral-message.converter';

@Injectable()
export class MistralStreamInferenceHandler implements StreamInferenceHandler {
  private readonly logger = new Logger(MistralStreamInferenceHandler.name);
  private readonly client: Mistral;
  private readonly converter: MistralMessageConverter;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageContentService: ImageContentService,
  ) {
    this.client = new Mistral({
      apiKey: this.configService.get('mistral.apiKey'),
    });
    this.converter = new MistralMessageConverter(imageContentService);
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
      const mistralTools = tools.map((t) => this.converter.convertTool(t));
      const mistralMessages = await this.converter.convertMessages(
        messages,
        orgId,
      );
      const mistralToolChoice = toolChoice
        ? this.converter.convertToolChoice(toolChoice)
        : undefined;

      const completionOptions: ChatCompletionStreamRequest = {
        model: input.model.name,
        messages: systemPrompt
          ? [
              this.converter.convertSystemPrompt(systemPrompt),
              ...mistralMessages,
            ]
          : mistralMessages,
        tools: mistralTools,
        toolChoice: mistralToolChoice,
        maxTokens: 10000,
        stream: true,
      };

      this.logger.debug('completionOptions', completionOptions);

      const completionFn = () => this.client.chat.stream(completionOptions);

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

  private convertChunk(
    chunk: CompletionEvent,
  ): StreamInferenceResponseChunk | null {
    const choice = chunk.data.choices[0];
    const textContentDelta = this.extractTextDelta(choice.delta.content);
    const toolCallsDelta = this.extractToolCallsDelta(choice.delta.toolCalls);
    const finishReason = choice.finishReason;
    const usage = chunk.data.usage;

    if (!textContentDelta && !toolCallsDelta.length && !usage && !finishReason)
      return null;

    return new StreamInferenceResponseChunk({
      thinkingDelta: null,
      textContentDelta,
      toolCallsDelta,
      finishReason,
      usage: usage
        ? {
            inputTokens: usage.promptTokens,
            outputTokens: usage.completionTokens,
          }
        : undefined,
    });
  }

  private extractTextDelta(
    content: string | Array<{ type: string; text?: string }> | null | undefined,
  ): string | null {
    if (!content) return null;
    if (Array.isArray(content)) {
      return (
        content
          .map((c) => (c.type === 'text' ? c.text : null))
          .filter(Boolean)
          .join('') || null
      );
    }
    return content;
  }

  private extractToolCallsDelta(
    toolCalls:
      | Array<{
          index?: number;
          id?: string;
          function: { name: string; arguments: unknown };
        }>
      | null
      | undefined,
  ): StreamInferenceResponseChunkToolCall[] {
    if (!toolCalls) return [];
    return toolCalls
      .filter((tc) => tc.index !== undefined)
      .map((tc) => ({
        index: tc.index!,
        id: tc.id ?? null,
        name: tc.function.name,
        argumentsDelta:
          typeof tc.function.arguments === 'string'
            ? tc.function.arguments
            : JSON.stringify(tc.function.arguments),
        providerMetadata: null,
      }));
  }
}
