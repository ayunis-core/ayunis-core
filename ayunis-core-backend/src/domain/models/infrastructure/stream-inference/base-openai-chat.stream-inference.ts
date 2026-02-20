import { Injectable, Logger } from '@nestjs/common';
import {
  StreamInferenceHandler,
  StreamInferenceInput,
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from '../../application/ports/stream-inference.handler';
import { Observable, Subscriber } from 'rxjs';
import OpenAI from 'openai';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { ThinkingContentParser } from 'src/common/util/thinking-content-parser';
import { OpenAIChatMessageConverter } from '../converters/openai-chat-message.converter';

@Injectable()
export class BaseOpenAIChatStreamInferenceHandler
  implements StreamInferenceHandler
{
  private readonly logger = new Logger(
    BaseOpenAIChatStreamInferenceHandler.name,
  );
  private readonly thinkingParser = new ThinkingContentParser();
  protected client: OpenAI;
  protected readonly chatConverter = new OpenAIChatMessageConverter();

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
      // Reset thinking parser for new stream
      this.thinkingParser.reset();

      const { messages, tools, toolChoice } = input;
      const openAiTools = tools
        .map((t) => this.chatConverter.convertTool(t))
        .map((tool) => ({
          ...tool,
          function: { ...tool.function, strict: true },
        }));
      const openAiMessages = this.chatConverter.convertMessages(messages);
      const systemPrompt = input.systemPrompt
        ? this.chatConverter.convertSystemPrompt(input.systemPrompt)
        : undefined;

      const completionOptions: OpenAI.ChatCompletionCreateParamsStreaming = {
        model: input.model.name,
        messages: systemPrompt
          ? [systemPrompt, ...openAiMessages]
          : openAiMessages,
        tools: openAiTools,
        tool_choice: toolChoice
          ? this.chatConverter.convertToolChoice(toolChoice)
          : undefined,
        stream: true,
        stream_options: { include_usage: true },
      };
      this.logger.debug('completionOptions', completionOptions);
      const completionFn = () =>
        this.client.chat.completions.create(completionOptions);

      const response = await retryWithBackoff({
        fn: completionFn,
        maxRetries: 3,
        delay: 1000,
      });

      // With stream_options.include_usage, OpenAI may send usage in a
      // separate final chunk after the finish_reason chunk.  We must not
      // break out of the loop on finish_reason alone — instead we continue
      // until we have received the usage data (or the stream ends).
      let receivedFinishReason = false;

      for await (const chunk of response) {
        this.logger.debug('chunk', chunk);
        const delta = this.convertChunk(chunk);
        if (
          delta.textContentDelta ||
          delta.thinkingDelta ||
          delta.toolCallsDelta.length > 0 ||
          delta.usage
        ) {
          subscriber.next(delta);
        }
        if (delta.finishReason) receivedFinishReason = true;
        if (receivedFinishReason && delta.usage) break;
      }

      subscriber.complete();
    } catch (error) {
      subscriber.error(error);
    }
  };

  private convertChunk = (
    chunk: OpenAI.ChatCompletionChunk,
  ): StreamInferenceResponseChunk => {
    const delta = chunk.choices[0]?.delta;
    const textContent = delta.content ?? null;

    // Parse thinking content from text
    const { thinkingDelta, textContentDelta } = textContent
      ? this.thinkingParser.parse(textContent)
      : { thinkingDelta: null, textContentDelta: null };

    const finishReason = chunk.choices[0]?.finish_reason ?? null;
    const usage = chunk.usage;

    return new StreamInferenceResponseChunk({
      thinkingDelta,
      textContentDelta,
      toolCallsDelta:
        delta.tool_calls?.map(
          (toolCall) =>
            new StreamInferenceResponseChunkToolCall({
              index: toolCall.index,
              id: toolCall.id ?? null,
              name: toolCall.function?.name ?? null,
              argumentsDelta: toolCall.function?.arguments ?? null,
            }),
        ) ?? [],
      finishReason,
      usage: usage
        ? {
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
          }
        : undefined,
    });
  };
}
