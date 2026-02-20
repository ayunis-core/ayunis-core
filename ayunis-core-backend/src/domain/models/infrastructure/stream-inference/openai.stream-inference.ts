import {
  StreamInferenceHandler,
  StreamInferenceInput,
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from '../../application/ports/stream-inference.handler';
import { Observable, Subscriber } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { Logger, Injectable } from '@nestjs/common';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { OpenAIResponsesMessageConverter } from '../converters/openai-responses-message.converter';

@Injectable()
export class OpenAIStreamInferenceHandler implements StreamInferenceHandler {
  private readonly logger = new Logger(OpenAIStreamInferenceHandler.name);
  private readonly client: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly converter: OpenAIResponsesMessageConverter,
  ) {
    this.client = new OpenAI({
      apiKey: this.configService.get('openai.apiKey'),
    });
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
      const { messages, tools, toolChoice, orgId } = input;
      const openAiTools = tools.map((t) => this.converter.convertTool(t));
      const openAiMessages = await this.converter.convertMessages(
        messages,
        orgId,
      );
      const isGpt5 = input.model.name.startsWith('gpt-5');

      const completionOptions: OpenAI.Responses.ResponseCreateParamsStreaming =
        {
          instructions: input.systemPrompt,
          input: openAiMessages,
          reasoning: isGpt5
            ? {
                effort: 'low',
              }
            : undefined,
          model: input.model.name,
          stream: true,
          store: false,
          tools: openAiTools,
          tool_choice: toolChoice
            ? this.converter.convertToolChoice(toolChoice)
            : undefined,
        };
      this.logger.debug('completionOptions', completionOptions);
      const completionFn = () =>
        this.client.responses.create(completionOptions);

      const response = await retryWithBackoff({
        fn: completionFn,
        maxRetries: 3,
        delay: 1000,
      });

      for await (const chunk of response) {
        const delta = this.convertChunk(chunk);
        if (!delta) continue;
        subscriber.next(delta);
      }

      subscriber.complete();
    } catch (error) {
      subscriber.error(error);
    }
  }

  private convertChunk = (
    chunk: OpenAI.Responses.ResponseStreamEvent,
  ): StreamInferenceResponseChunk | null => {
    if (chunk.type !== 'response.output_text.delta')
      this.logger.debug('convertChunk', chunk);
    return this.dispatchChunkByType(chunk);
  };

  private dispatchChunkByType(
    chunk: OpenAI.Responses.ResponseStreamEvent,
  ): StreamInferenceResponseChunk | null {
    if (chunk.type === 'response.reasoning_summary_text.delta')
      return StreamInferenceResponseChunk.thinking(chunk.delta);
    if (chunk.type === 'response.output_text.delta')
      return StreamInferenceResponseChunk.text(chunk.delta);
    if (chunk.type === 'response.completed')
      return this.convertCompletedChunk(chunk);
    if (chunk.type === 'response.function_call_arguments.delta')
      return this.convertFunctionCallArgsDelta(chunk);
    if (chunk.type === 'response.output_item.added')
      return this.convertOutputItemAdded(chunk);
    return null;
  }

  private convertCompletedChunk(
    chunk: OpenAI.Responses.ResponseCompletedEvent,
  ): StreamInferenceResponseChunk {
    const usage = chunk.response.usage;
    const { thinkingId, thinkingSignature } = this.extractReasoningMetadata(
      chunk.response.output,
    );
    return new StreamInferenceResponseChunk({
      thinkingDelta: null,
      thinkingId,
      thinkingSignature,
      textContentDelta: null,
      toolCallsDelta: [],
      finishReason: 'stop',
      usage: usage
        ? { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens }
        : undefined,
    });
  }

  private extractReasoningMetadata(
    output: OpenAI.Responses.ResponseOutputItem[],
  ): { thinkingId: string | null; thinkingSignature: string | null } {
    const item = output.find((i) => i.type === 'reasoning');
    if (!item || !('id' in item)) {
      return { thinkingId: null, thinkingSignature: null };
    }
    return {
      thinkingId: (item as { id?: string }).id ?? null,
      thinkingSignature:
        (item as { encrypted_content?: string }).encrypted_content ?? null,
    };
  }

  private convertFunctionCallArgsDelta(
    chunk: OpenAI.Responses.ResponseFunctionCallArgumentsDeltaEvent,
  ): StreamInferenceResponseChunk {
    return new StreamInferenceResponseChunk({
      thinkingDelta: null,
      textContentDelta: null,
      toolCallsDelta: [
        new StreamInferenceResponseChunkToolCall({
          index: chunk.output_index,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- SDK types may not reflect null at runtime
          id: chunk.item_id ?? null,
          name: null,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- SDK types may not reflect null at runtime
          argumentsDelta: chunk.delta ?? null,
        }),
      ],
    });
  }

  private convertOutputItemAdded(
    chunk: OpenAI.Responses.ResponseOutputItemAddedEvent,
  ): StreamInferenceResponseChunk | null {
    if (chunk.item.type !== 'function_call') return null;
    return new StreamInferenceResponseChunk({
      thinkingDelta: null,
      textContentDelta: null,
      toolCallsDelta: [
        new StreamInferenceResponseChunkToolCall({
          index: chunk.output_index,
          id: chunk.item.id ?? null,
          name: chunk.item.name,
          argumentsDelta: null,
        }),
      ],
    });
  }
}
