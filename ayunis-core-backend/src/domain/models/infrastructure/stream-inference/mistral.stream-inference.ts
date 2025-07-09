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
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import {
  ToolCall as MistralToolCall,
  Tool as MistralTool,
  Messages as MistralMessages,
  ToolChoiceEnum as MistralToolChoiceEnum,
  ToolChoice as MistralToolChoice,
  ChatCompletionStreamRequest,
  CompletionEvent,
} from '@mistralai/mistralai/models/components';

@Injectable()
export class MistralStreamInferenceHandler implements StreamInferenceHandler {
  private readonly logger = new Logger(MistralStreamInferenceHandler.name);
  private readonly client: Mistral;

  constructor(private readonly configService: ConfigService) {
    this.client = new Mistral({
      apiKey: this.configService.get('mistral.apiKey'),
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
      const { messages, tools, toolChoice, systemPrompt } = input;
      const mistralTools = tools?.map(this.convertTool);
      const mistralMessages = this.convertMessages(messages);
      const mistralToolChoice = toolChoice
        ? this.convertToolChoice(toolChoice)
        : undefined;

      const completionOptions: ChatCompletionStreamRequest = {
        model: input.model.name,
        messages: [this.convertSystemPrompt(systemPrompt), ...mistralMessages],
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

  private convertTool = (tool: Tool): MistralTool => {
    return {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as Record<string, any>,
      },
    };
  };

  private convertSystemPrompt = (systemPrompt: string): MistralMessages => {
    return {
      role: 'system' as const,
      content: systemPrompt,
    };
  };

  private convertMessages = (
    messages: Message[],
    systemPrompt?: string,
  ): MistralMessages[] => {
    const convertedMessages: MistralMessages[] = [];

    // Add system message if provided
    if (systemPrompt) {
      convertedMessages.push({
        role: 'system' as const,
        content: systemPrompt,
      });
    }

    for (const message of messages) {
      convertedMessages.push(...this.convertMessage(message));
    }

    return convertedMessages;
  };

  private convertMessage = (message: Message): MistralMessages[] => {
    const convertedMessages: MistralMessages[] = [];

    // User Message
    if (message instanceof UserMessage) {
      for (const content of message.content) {
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

    // Assistant Message
    if (message instanceof AssistantMessage) {
      let assistantTextMessageContent: string | undefined = undefined;
      let assistantToolUseMessageContent: MistralToolCall[] | undefined =
        undefined;

      for (const content of message.content) {
        if (content instanceof TextMessageContent) {
          assistantTextMessageContent = content.text;
        }
        if (content instanceof ToolUseMessageContent) {
          if (!assistantToolUseMessageContent) {
            assistantToolUseMessageContent = [
              {
                id: content.id,
                type: 'function',
                function: {
                  name: content.name,
                  arguments: content.params,
                },
              },
            ];
          } else {
            assistantToolUseMessageContent.push({
              id: content.id,
              type: 'function',
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
        content: assistantTextMessageContent,
        toolCalls: assistantToolUseMessageContent,
      });
    }

    // System Message
    if (message instanceof SystemMessage) {
      for (const content of message.content) {
        convertedMessages.push({
          role: 'system' as const,
          content: content.text,
        });
      }
    }

    // Tool Result Message
    if (message instanceof ToolResultMessage) {
      for (const content of message.content) {
        convertedMessages.push({
          role: 'tool' as const,
          toolCallId: content.toolId,
          content: content.result,
        });
      }
      if (
        message.content.every(
          (c) => c.result === 'Tool has been displayed successfully',
        )
      ) {
        convertedMessages.push({
          role: 'assistant' as const,
          content: 'Awaiting user input',
        });
      }
    }

    return convertedMessages;
  };

  private convertToolChoice = (
    toolChoice: ModelToolChoice,
  ): MistralToolChoice | MistralToolChoiceEnum => {
    if (toolChoice === ModelToolChoice.AUTO) {
      return 'auto';
    } else if (toolChoice === ModelToolChoice.REQUIRED) {
      return 'required';
    } else {
      return { type: 'function', function: { name: toolChoice } };
    }
  };

  private convertChunk = (
    chunk: CompletionEvent,
  ): StreamInferenceResponseChunk | null => {
    // Mistral streaming chunks have different structures
    // Handle text content delta
    let textContentDelta: string | null = null;
    let toolCallsDelta: StreamInferenceResponseChunkToolCall[] = [];
    const content = chunk.data.choices?.[0]?.delta?.content;
    if (content) {
      if (Array.isArray(content)) {
        // content is an array of content chunks
        textContentDelta = content
          .map((c) => (c.type === 'text' ? c.text : null))
          .filter(Boolean)
          .join('');
      } else {
        // content is a string
        textContentDelta = content;
      }
    }
    const toolCalls = chunk.data.choices?.[0]?.delta?.toolCalls;
    if (toolCalls) {
      toolCallsDelta = toolCalls
        .filter((toolCall) => toolCall.index !== undefined)
        .map((toolCall) => ({
          index: toolCall.index!,
          id: toolCall.id || null,
          name: toolCall.function?.name,
          argumentsDelta:
            typeof toolCall.function?.arguments === 'string'
              ? toolCall.function?.arguments
              : JSON.stringify(toolCall.function?.arguments),
        }));
    }
    if (!textContentDelta && !toolCallsDelta.length) {
      return null;
    }

    return new StreamInferenceResponseChunk({
      textContentDelta,
      toolCallsDelta,
    });
  };
}
