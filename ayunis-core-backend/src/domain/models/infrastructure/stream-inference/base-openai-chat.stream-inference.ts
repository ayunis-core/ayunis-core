import { Injectable, Logger } from '@nestjs/common';
import {
  StreamInferenceHandler,
  StreamInferenceInput,
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from '../../application/ports/stream-inference.handler';
import { Observable, Subscriber } from 'rxjs';
import OpenAI from 'openai';
import { FunctionParameters } from 'openai/resources/shared';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { ThinkingContentParser } from 'src/common/util/thinking-content-parser';
import { normalizeSchemaForOpenAI } from '../util/normalize-schema-for-openai';

@Injectable()
export class BaseOpenAIChatStreamInferenceHandler
  implements StreamInferenceHandler
{
  private readonly logger = new Logger(
    BaseOpenAIChatStreamInferenceHandler.name,
  );
  private readonly thinkingParser = new ThinkingContentParser();
  protected client: OpenAI;

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
      const openAiTools = tools?.map(this.convertTool).map((tool) => ({
        ...tool,
        function: { ...tool.function, strict: true },
      }));
      const openAiMessages = this.convertMessages(messages);
      const systemPrompt = input.systemPrompt
        ? this.convertSystemPrompt(input.systemPrompt)
        : undefined;

      const completionOptions: OpenAI.ChatCompletionCreateParamsStreaming = {
        model: input.model.name,
        messages: systemPrompt
          ? [systemPrompt, ...openAiMessages]
          : openAiMessages,
        tools: openAiTools,
        tool_choice: toolChoice
          ? this.convertToolChoice(toolChoice)
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
        if (delta.finishReason) break;
      }

      subscriber.complete();
    } catch (error) {
      subscriber.error(error);
    }
  };

  private convertTool = (tool: Tool): OpenAI.ChatCompletionTool => {
    return {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: normalizeSchemaForOpenAI(
          tool.parameters as Record<string, unknown> | undefined,
        ) as FunctionParameters | undefined,
      },
    };
  };

  private convertSystemPrompt = (
    systemPrompt: string,
  ): OpenAI.ChatCompletionMessageParam => {
    return {
      role: 'system' as const,
      content: systemPrompt,
    };
  };

  private convertMessages = (
    messages: Message[],
  ): OpenAI.ChatCompletionMessageParam[] => {
    const convertedMessages: OpenAI.ChatCompletionMessageParam[] = [];
    for (const message of messages) {
      convertedMessages.push(...this.convertMessage(message));
    }
    return convertedMessages;
  };

  private convertMessage = (
    message: Message,
  ): OpenAI.ChatCompletionMessageParam[] => {
    const convertedMessages: OpenAI.ChatCompletionMessageParam[] = [];
    // User Message
    if (message.role === MessageRole.USER) {
      for (const content of message.content) {
        // Text Message Content
        if (content instanceof TextMessageContent) {
          convertedMessages.push({
            role: 'user' as const,
            content: [
              {
                type: 'text' as const,
                text: content.text,
              },
            ],
          });
        }
      }
    }

    if (message.role === MessageRole.ASSISTANT) {
      let assistantTextMessageContent: string | undefined = undefined;
      let assistantToolUseMessageContent:
        | OpenAI.ChatCompletionMessageToolCall[]
        | undefined = undefined;

      for (const content of message.content) {
        // Text Message Content
        if (content instanceof TextMessageContent) {
          assistantTextMessageContent = content.text;
        }
        // Thinking Message Content (ignore for OpenAI Chat Completions API)
        if (content instanceof ThinkingMessageContent) {
          // OpenAI Chat Completions API doesn't support thinking natively
          // Skip this content type
          continue;
        }
        // Tool Use Message Content
        if (content instanceof ToolUseMessageContent) {
          if (!assistantToolUseMessageContent) {
            assistantToolUseMessageContent = [
              {
                id: content.id,
                type: 'function',
                function: {
                  name: content.name,
                  arguments: JSON.stringify(content.params),
                },
              },
            ];
          } else {
            assistantToolUseMessageContent.push({
              id: content.id,
              type: 'function',
              function: {
                name: content.name,
                arguments: JSON.stringify(content.params),
              },
            });
          }
        }
      }
      convertedMessages.push({
        role: 'assistant' as const,
        content: assistantTextMessageContent,
        tool_calls: assistantToolUseMessageContent,
      });
    }

    if (message.role === MessageRole.SYSTEM) {
      for (const content of message.content) {
        if (content instanceof TextMessageContent) {
          convertedMessages.push({
            role: 'system' as const,
            content: content.text,
          });
        }
      }
    }

    if (message.role === MessageRole.TOOL) {
      for (const content of message.content) {
        if (content instanceof ToolResultMessageContent) {
          convertedMessages.push({
            role: 'tool' as const,
            tool_call_id: content.toolId,
            content: content.result,
          });
        }
      }
    }

    return convertedMessages;
  };

  private convertToolChoice = (
    toolChoice: ModelToolChoice,
  ): OpenAI.ChatCompletionToolChoiceOption => {
    if (toolChoice === ModelToolChoice.AUTO) {
      return 'auto';
    } else if (toolChoice === ModelToolChoice.REQUIRED) {
      return 'required';
    } else {
      return { type: 'function', function: { name: toolChoice } };
    }
  };

  private convertChunk = (
    chunk: OpenAI.ChatCompletionChunk,
  ): StreamInferenceResponseChunk => {
    const delta = chunk.choices[0]?.delta;
    const textContent = delta?.content ?? null;

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
        delta?.tool_calls?.map(
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
