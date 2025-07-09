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
  Tool as OllamaTool,
  Message as OllamaMessage,
  ToolCall as OllamaToolCall,
  ChatResponse,
} from 'ollama';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';

@Injectable()
export class BaseOllamaStreamInferenceHandler
  implements StreamInferenceHandler
{
  private readonly logger = new Logger(BaseOllamaStreamInferenceHandler.name);
  protected client: Ollama;

  // constructor(private readonly configService: ConfigService) {
  //   this.client = new Ollama({
  //     host: this.configService.get('models.ollama.baseURL'),
  //   });
  // }

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
      const { messages, tools } = input;
      const ollamaTools = tools?.map(this.convertTool).map((tool) => ({
        ...tool,
        function: { ...tool.function, strict: true },
      }));
      const ollamaMessages = this.convertMessages(messages);
      const systemPrompt = this.convertSystemPrompt(input.systemPrompt);
      const completionOptions: ChatRequest & { stream: true } = {
        model: input.model.name,
        messages: [systemPrompt, ...ollamaMessages],
        tools: ollamaTools,
        stream: true,
      };
      this.logger.debug('completionOptions', completionOptions);
      const completionFn = () => this.client.chat(completionOptions);

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
  };

  private convertTool = (tool: Tool): OllamaTool => {
    return {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as Record<string, unknown>,
      },
    };
  };

  private convertSystemPrompt = (systemPrompt: string): OllamaMessage => {
    return {
      role: 'system' as const,
      content: systemPrompt,
    };
  };

  private convertMessages = (messages: Message[]): OllamaMessage[] => {
    const convertedMessages: OllamaMessage[] = [];
    for (const message of messages) {
      convertedMessages.push(...this.convertMessage(message));
    }
    return convertedMessages;
  };

  private convertMessage = (message: Message): OllamaMessage[] => {
    const convertedMessages: OllamaMessage[] = [];
    // User Message
    if (message.role === MessageRole.USER) {
      for (const content of message.content) {
        // Text Message Content
        if (content instanceof TextMessageContent) {
          convertedMessages.push({
            role: 'user' as const,
            content: content.text,
          });
        }
      }
    }

    if (message.role === MessageRole.ASSISTANT) {
      let assistantTextMessageContent: string | undefined = undefined;
      let assistantToolUseMessageContent: OllamaToolCall[] | undefined =
        undefined;

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
                function: {
                  name: content.name,
                  arguments: content.params,
                },
              },
            ];
          } else {
            assistantToolUseMessageContent.push({
              function: {
                name: content.name,
                arguments: content.params,
              },
            });
          }
        }
      }
      convertedMessages.push({
        role: 'assistant' as const,
        content: assistantTextMessageContent ?? '',
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
            content: content.result,
          });
        }
      }
    }

    return convertedMessages;
  };

  private convertChunk = (
    chunk: ChatResponse,
  ): StreamInferenceResponseChunk => {
    const delta = chunk.message;
    return new StreamInferenceResponseChunk({
      textContentDelta: delta.content ?? null,
      toolCallsDelta:
        delta.tool_calls?.map(
          (toolCall) =>
            new StreamInferenceResponseChunkToolCall({
              index: 0,
              id: null,
              name: toolCall.function?.name,
              argumentsDelta: JSON.stringify(toolCall.function?.arguments),
            }),
        ) ?? [],
    });
  };
}
