import {
  StreamInferenceHandler,
  StreamInferenceInput,
  StreamInferenceResponseChunk,
  StreamInferenceResponseChunkToolCall,
} from '../../application/ports/stream-inference.handler';
import { Observable, Subscriber } from 'rxjs';
import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '@nestjs/common';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
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
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import { ImageContentService } from 'src/domain/messages/application/services/image-content.service';

type AnthropicToolChoice = ToolChoiceAny | ToolChoiceAuto | ToolChoiceTool;

// Type for Anthropic-compatible clients (Anthropic SDK and Bedrock SDK)
// Only requires the messages.create method which is what we use
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

  constructor(protected readonly imageContentService: ImageContentService) {}

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
      const anthropicTools = tools?.map(this.convertTool);
      const anthropicMessages = await this.convertMessages(messages, orgId);
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

  protected convertTool = (tool: Tool): Anthropic.Tool => {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as Anthropic.Messages.Tool.InputSchema,
    };
  };

  protected convertMessages = async (
    messages: Message[],
    orgId: string,
  ): Promise<Anthropic.MessageParam[]> => {
    const chatMessages = await messages.reduce<
      Promise<Anthropic.MessageParam[]>
    >(
      async (accPromise, message) => {
        const convertedMessages = await accPromise;
        // always push the first message and next loop
        if (convertedMessages.length === 0) {
          convertedMessages.push(await this.convertMessage(message, orgId));
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
          convertedMessages.push(await this.convertMessage(message, orgId));
          return convertedMessages;
        }

        // all other messages are combined as one user message
        // so assistant and user messages always follow each other
        // user -> assistant -> user -> assistant
        const convertedMessage = await this.convertMessage(message, orgId);

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
      },
      Promise.resolve([] as Anthropic.MessageParam[]),
    );
    return chatMessages;
  };

  protected convertMessage = async (
    message: Message,
    orgId: string,
  ): Promise<Anthropic.MessageParam> => {
    if (message instanceof UserMessage) {
      return {
        role: 'user',
        content: await Promise.all(
          message.content.map((content) =>
            this.convertUserContent(content, {
              orgId,
              threadId: message.threadId,
              messageId: message.id,
            }),
          ),
        ),
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

  protected convertToolChoice = (
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

  protected convertChunk = (
    chunk: Anthropic.Messages.MessageStreamEvent,
  ): StreamInferenceResponseChunk | null => {
    // Handle different types of streaming events
    if (chunk.type === 'content_block_delta') {
      if (chunk.delta.type === 'text_delta') {
        return new StreamInferenceResponseChunk({
          thinkingDelta: null,
          textContentDelta: chunk.delta.text,
          toolCallsDelta: [],
        });
      }
      if (chunk.delta.type === 'input_json_delta') {
        // Tool call argument delta
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
    }

    if (chunk.type === 'content_block_start') {
      if (chunk.content_block.type === 'tool_use') {
        // Tool call start
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
    }

    // Handle message_start events for input tokens
    // input_tokens are only sent in message_start, not in message_delta
    if (chunk.type === 'message_start') {
      const usage = chunk.message.usage;
      if (usage?.input_tokens !== undefined) {
        return new StreamInferenceResponseChunk({
          thinkingDelta: null,
          textContentDelta: null,
          toolCallsDelta: [],
          usage: {
            inputTokens: usage.input_tokens,
            outputTokens: undefined,
          },
        });
      }
    }

    // Handle message_delta events for output tokens
    // output_tokens are sent in message_delta at the end of the stream
    if (chunk.type === 'message_delta') {
      const usage = chunk.usage;
      if (usage?.output_tokens !== undefined) {
        return new StreamInferenceResponseChunk({
          thinkingDelta: null,
          textContentDelta: null,
          toolCallsDelta: [],
          usage: {
            inputTokens: undefined,
            outputTokens: usage.output_tokens,
          },
        });
      }
    }

    // Return null for other event types we don't need to handle
    return null;
  };

  protected async convertUserContent(
    content: TextMessageContent | ImageMessageContent,
    context: { orgId: string; threadId: string; messageId: string },
  ): Promise<Anthropic.ImageBlockParam | Anthropic.TextBlockParam> {
    if (content instanceof TextMessageContent) {
      return {
        type: 'text',
        text: content.text,
      };
    }

    if (!(content instanceof ImageMessageContent)) {
      throw new Error(`Unsupported user content type for Anthropic`);
    }

    return this.convertImageContent(content, context);
  }

  protected async convertImageContent(
    content: ImageMessageContent,
    context: { orgId: string; threadId: string; messageId: string },
  ): Promise<Anthropic.ImageBlockParam> {
    const imageData = await this.imageContentService.convertImageToBase64(
      content,
      context,
    );

    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: imageData.contentType,
        data: imageData.base64,
      },
    };
  }
}
