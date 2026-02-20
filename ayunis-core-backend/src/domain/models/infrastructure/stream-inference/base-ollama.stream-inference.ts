import { Injectable, Logger } from '@nestjs/common';
import {
  StreamInferenceHandler,
  StreamInferenceInput,
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from '../../application/ports/stream-inference.handler';
import { Observable, Subscriber } from 'rxjs';
import {
  Ollama,
  ChatRequest,
  ToolCall as OllamaToolCall,
  ChatResponse,
} from 'ollama';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { ThinkingContentParser } from 'src/common/util/thinking-content-parser';
import { randomUUID } from 'crypto';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { OllamaMessageConverter } from '../converters/ollama-message.converter';

@Injectable()
export class BaseOllamaStreamInferenceHandler
  implements StreamInferenceHandler
{
  private readonly logger = new Logger(BaseOllamaStreamInferenceHandler.name);
  private readonly thinkingParser = new ThinkingContentParser();
  protected client: Ollama;
  protected imageContentService?: ImageContentService;
  protected converter: OllamaMessageConverter;

  protected initConverter(): void {
    this.converter = new OllamaMessageConverter(this.imageContentService);
  }

  answer(
    input: StreamInferenceInput,
  ): Observable<StreamInferenceResponseChunk> {
    return new Observable<StreamInferenceResponseChunk>((subscriber) => {
      void this.streamResponse(input, subscriber);
    });
  }

  private streamResponse = async (
    input: StreamInferenceInput,
    subscriber: Subscriber<StreamInferenceResponseChunk>,
  ): Promise<void> => {
    try {
      this.thinkingParser.reset();
      const completionOptions = await this.buildCompletionOptions(input);
      this.logger.debug('completionOptions', completionOptions);

      const completionFn = () => this.client.chat(completionOptions);
      const response = await retryWithBackoff({
        fn: completionFn,
        maxRetries: 3,
        delay: 1000,
      });

      for await (const chunk of response) {
        const delta = this.convertChunk(chunk);
        const hasContent =
          Boolean(delta.textContentDelta) ||
          Boolean(delta.thinkingDelta) ||
          delta.toolCallsDelta.length > 0 ||
          Boolean(delta.usage);
        if (hasContent) subscriber.next(delta);
        if (delta.finishReason) break;
      }

      subscriber.complete();
    } catch (error) {
      subscriber.error(error);
    }
  };

  private buildCompletionOptions = async (
    input: StreamInferenceInput,
  ): Promise<ChatRequest & { stream: true }> => {
    const { messages, tools, orgId } = input;
    const ollamaTools = tools
      .map((t) => this.converter.convertTool(t))
      .map((tool) => ({
        ...tool,
        function: { ...tool.function, strict: true },
      }));
    const ollamaMessages = await this.converter.convertMessages(
      messages,
      orgId,
    );
    const systemPrompt = input.systemPrompt
      ? this.converter.convertSystemPrompt(input.systemPrompt)
      : undefined;

    return {
      model: input.model.name,
      messages: systemPrompt
        ? [systemPrompt, ...ollamaMessages]
        : ollamaMessages,
      tools: ollamaTools.length > 0 ? ollamaTools : undefined,
      stream: true as const,
      options: { num_ctx: 30000 },
    };
  };

  private convertChunk = (
    chunk: ChatResponse,
  ): StreamInferenceResponseChunk => {
    const delta = chunk.message;
    const { thinkingDelta, textContentDelta } = this.parseChunkContent(delta);
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- thinking may be empty string at runtime
    const thinkingContent = delta.thinking || null;

    return new StreamInferenceResponseChunk({
      thinkingDelta: thinkingContent ?? thinkingDelta,
      textContentDelta,
      toolCallsDelta: this.convertToolCalls(delta.tool_calls),
      finishReason: chunk.done ? chunk.done_reason : null,
      usage: this.extractChunkUsage(chunk),
    });
  };

  private parseChunkContent = (
    delta: ChatResponse['message'],
  ): { thinkingDelta: string | null; textContentDelta: string | null } => {
    const textContent = delta.content;
    return textContent
      ? this.thinkingParser.parse(textContent)
      : { thinkingDelta: null, textContentDelta: null };
  };

  private convertToolCalls = (
    toolCalls: OllamaToolCall[] | undefined,
  ): StreamInferenceResponseChunkToolCall[] =>
    toolCalls?.map(
      (toolCall) =>
        new StreamInferenceResponseChunkToolCall({
          index: 0,
          id: randomUUID(),
          name: toolCall.function.name,
          argumentsDelta: JSON.stringify(toolCall.function.arguments),
        }),
    ) ?? [];

  private extractChunkUsage = (chunk: ChatResponse) => {
    if (!chunk.done) return undefined;
    return {
      inputTokens: chunk.prompt_eval_count,
      outputTokens: chunk.eval_count,
    };
  };
}
