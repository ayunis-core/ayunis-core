import {
  StreamInferenceHandler,
  StreamInferenceInput,
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from '../../application/ports/stream-inference.handler';
import { Observable, Subscriber } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { OpenAI } from 'openai';
import { FunctionParameters } from 'openai/resources/shared';
import { Logger, Injectable } from '@nestjs/common';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';

@Injectable()
export class OpenAIStreamInferenceHandler implements StreamInferenceHandler {
  private readonly logger = new Logger(OpenAIStreamInferenceHandler.name);
  private readonly client: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.get('openai.apiKey'),
    });
  }

  answer(
    input: StreamInferenceInput,
  ): Observable<StreamInferenceResponseChunk> {
    return new Observable<StreamInferenceResponseChunk>((subscriber) => {
      this.streamResponse(input, subscriber);
    });
  }

  private async streamResponse(
    input: StreamInferenceInput,
    subscriber: Subscriber<StreamInferenceResponseChunk>,
  ): Promise<void> {
    try {
      const { messages, tools, toolChoice } = input;
      const openAiTools = tools?.map(this.convertTool).map((tool) => ({
        ...tool,
        function: { ...tool.function, strict: true },
      }));
      const openAiMessages = this.convertMessages(messages);
      const completionOptions: OpenAI.ChatCompletionCreateParamsStreaming = {
        model: input.model.name,
        messages: openAiMessages,
        tools: openAiTools,
        tool_choice: toolChoice
          ? this.convertToolChoice(toolChoice)
          : undefined,
        max_tokens: 1000,
        stream: true,
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
        const delta = this.convertChunk(chunk);
        subscriber.next(delta);
      }

      subscriber.complete();
    } catch (error) {
      subscriber.error(error);
    }
  }

  private convertTool(tool: Tool): OpenAI.ChatCompletionTool {
    return {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as FunctionParameters | undefined,
      },
    };
  }

  private convertMessages(
    messages: Message[],
  ): OpenAI.ChatCompletionMessageParam[] {
    const convertedMessages: OpenAI.ChatCompletionMessageParam[] = [];
    for (const message of messages) {
      convertedMessages.push(...this.convertMessage(message));
    }
    return convertedMessages;
  }

  private convertMessage(
    message: Message,
  ): OpenAI.ChatCompletionMessageParam[] {
    const convertedMessages: OpenAI.ChatCompletionMessageParam[] = [];
    // User Message
    if (message.role === 'user') {
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

    if (message.role === 'assistant') {
      let assistantTextMessageContent: string | undefined = undefined;
      let assistantToolUseMessageContent:
        | OpenAI.ChatCompletionMessageToolCall[]
        | undefined = undefined;

      for (const content of message.content) {
        // Text Message Content
        if (content instanceof TextMessageContent) {
          assistantTextMessageContent = content.text;
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

    if (message instanceof SystemMessage) {
      for (const content of message.content) {
        convertedMessages.push({
          role: 'system' as const,
          content: content.text,
        });
      }
    }

    if (message instanceof ToolResultMessage) {
      for (const content of message.content) {
        convertedMessages.push({
          role: 'tool' as const,
          tool_call_id: content.toolId,
          content: content.result,
        });
      }
    }

    return convertedMessages;
  }

  private convertToolChoice(
    toolChoice: ModelToolChoice,
  ): OpenAI.ChatCompletionToolChoiceOption {
    if (toolChoice === 'auto') {
      return 'auto';
    } else if (toolChoice === 'required') {
      return 'required';
    } else {
      return { type: 'function', function: { name: toolChoice } };
    }
  }

  private convertChunk(
    chunk: OpenAI.ChatCompletionChunk,
  ): StreamInferenceResponseChunk {
    const delta = chunk.choices[0].delta;
    return new StreamInferenceResponseChunk({
      textContentDelta: delta.content ?? null,
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
    });
  }
}
