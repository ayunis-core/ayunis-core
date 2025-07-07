import {
  StreamInferenceHandler,
  StreamInferenceInput,
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from '../../application/ports/stream-inference.handler';
import { Observable, Subscriber } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
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
  MessageCreateParamsStreaming,
  ToolChoiceAny,
  ToolChoiceAuto,
  ToolChoiceTool,
} from '@anthropic-ai/sdk/resources/messages';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';

type AnthropicToolChoice = ToolChoiceAny | ToolChoiceAuto | ToolChoiceTool;

@Injectable()
export class AnthropicStreamInferenceHandler implements StreamInferenceHandler {
  private readonly logger = new Logger(AnthropicStreamInferenceHandler.name);
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get('anthropic.apiKey'),
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
      const anthropicTools = tools?.map(this.convertTool);
      const anthropicMessages = this.convertMessages(messages);
      const anthropicToolChoice = toolChoice
        ? this.convertToolChoice(toolChoice)
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

  private convertTool = (tool: Tool): Anthropic.Tool => {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as Anthropic.Messages.Tool.InputSchema,
    };
  };

  private convertMessages = (messages: Message[]): Anthropic.MessageParam[] => {
    const chatMessages = messages.reduce((convertedMessages, message) => {
      // always push the first message and next loop
      if (convertedMessages.length === 0) {
        convertedMessages.push(this.convertMessage(message));
        return convertedMessages;
      }
      const lastMessage = convertedMessages.pop();
      if (!lastMessage) {
        throw new Error('lastMessage is undefined');
      }
      // assistant messages are always separate so
      // an assistant message is always pushed
      // and the following message is always pushed
      if (
        message.role === MessageRole.ASSISTANT ||
        lastMessage.role === MessageRole.ASSISTANT
      ) {
        convertedMessages.push(lastMessage);
        convertedMessages.push(this.convertMessage(message));
        return convertedMessages;
      }

      // all other messages are combined as one user message
      // so assistant and user messages always follow each other
      // user -> assistant -> user -> assistant
      const convertedMessage = this.convertMessage(message);

      const convertedMessageContent =
        typeof convertedMessage.content === 'string'
          ? [{ type: 'text' as const, text: convertedMessage.content }]
          : convertedMessage.content;

      const lastMessageContent =
        typeof lastMessage.content === 'string'
          ? [{ type: 'text' as const, text: lastMessage.content }]
          : lastMessage.content;

      const allContent = [...lastMessageContent, ...convertedMessageContent];
      convertedMessages.push({ role: 'user', content: allContent });
      return convertedMessages;
    }, [] as Anthropic.MessageParam[]);
    return chatMessages;
  };

  private convertMessage = (message: Message): Anthropic.MessageParam => {
    if (message instanceof UserMessage) {
      return {
        role: 'user',
        content: message.content.map((content) => {
          return {
            type: 'text',
            text: content.text,
          };
        }),
      };
    }
    if (message instanceof AssistantMessage) {
      return {
        role: 'assistant',
        content: message.content.map((content) => {
          if (content instanceof TextMessageContent) {
            return {
              type: 'text',
              text: content.text,
            };
          }
          if (content instanceof ToolUseMessageContent) {
            return {
              type: 'tool_use',
              id: content.id,
              name: content.name,
              input: content.params,
            };
          }
          throw new Error(`Unknown message content type`);
        }),
      };
    }
    if (message instanceof ToolResultMessage) {
      return {
        role: 'user',
        content: message.content.map((content) => {
          return {
            type: 'tool_result',
            tool_use_id: content.toolId,
            content: content.result,
          };
        }),
      };
    }
    if (message instanceof SystemMessage) {
      return {
        role: 'user',
        content: message.content.map((content) => {
          return {
            type: 'text',
            text: content.text,
          };
        }),
      };
    }
    throw new Error(`Unknown message type`);
  };

  private convertToolChoice = (
    toolChoice: ModelToolChoice,
  ): AnthropicToolChoice => {
    if (toolChoice === ModelToolChoice.AUTO) {
      return { type: 'auto' };
    } else if (toolChoice === ModelToolChoice.REQUIRED) {
      throw new Error("Tool choice 'required' is not supported in Anthropic");
    } else {
      return { type: 'tool', name: toolChoice };
    }
  };

  private convertChunk = (
    chunk: Anthropic.Messages.MessageStreamEvent,
  ): StreamInferenceResponseChunk | null => {
    // Handle different types of streaming events
    if (chunk.type === 'content_block_delta') {
      if (chunk.delta.type === 'text_delta') {
        return new StreamInferenceResponseChunk({
          textContentDelta: chunk.delta.text,
          toolCallsDelta: [],
        });
      }
      if (chunk.delta.type === 'input_json_delta') {
        // Tool call argument delta
        return new StreamInferenceResponseChunk({
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
    }

    if (chunk.type === 'content_block_start') {
      if (chunk.content_block.type === 'tool_use') {
        // Tool call start
        return new StreamInferenceResponseChunk({
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
    }

    // Return null for other event types we don't need to handle
    return null;
  };
}
