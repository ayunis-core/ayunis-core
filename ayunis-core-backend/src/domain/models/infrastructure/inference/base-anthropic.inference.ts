import { Logger } from '@nestjs/common';
import type Anthropic from '@anthropic-ai/sdk';
import type {
  InferenceInput,
  InferenceResponse,
} from '../../application/ports/inference.handler';
import { InferenceHandler } from '../../application/ports/inference.handler';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type { Message } from 'src/domain/messages/domain/message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import type {
  MessageCreateParamsNonStreaming,
  ToolChoiceAny,
  ToolChoiceAuto,
  ToolChoiceTool,
} from '@anthropic-ai/sdk/resources/messages';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import retryWithBackoff from 'src/common/util/retryWithBackoff';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';

type AnthropicToolChoice = ToolChoiceAny | ToolChoiceAuto | ToolChoiceTool;

// Type for Anthropic-compatible clients (Anthropic SDK and Bedrock SDK)
// Only requires the messages.create method which is what we use
type AnthropicCompatibleClient = {
  messages: {
    create: Anthropic['messages']['create'];
  };
};

export abstract class BaseAnthropicInferenceHandler extends InferenceHandler {
  private readonly logger = new Logger(BaseAnthropicInferenceHandler.name);
  protected client: AnthropicCompatibleClient;

  constructor(protected readonly imageContentService: ImageContentService) {
    super();
  }

  async answer(input: InferenceInput): Promise<InferenceResponse> {
    this.logger.log('answer', {
      model: input.model.name,
      messageCount: input.messages.length,
      toolCount: input.tools.length ?? 0,
      toolChoice: input.toolChoice,
    });
    try {
      const { messages, tools, toolChoice, systemPrompt, orgId } = input;
      const anthropicTools = tools.map(this.convertTool);
      const anthropicMessages = await this.convertMessages(messages, orgId);
      const anthropicToolChoice = toolChoice
        ? this.convertToolChoice(toolChoice)
        : undefined;

      const completionOptions: MessageCreateParamsNonStreaming = {
        model: input.model.name,
        system: systemPrompt,
        messages: anthropicMessages,
        tools: anthropicTools,
        tool_choice: anthropicToolChoice,
        max_tokens: 1000,
        stream: false,
      };

      this.logger.debug('completionOptions', completionOptions);

      const completionFn = () => this.client.messages.create(completionOptions);

      const response = await retryWithBackoff({
        fn: completionFn,
        maxRetries: 3,
        delay: 1000,
      });

      const modelResponse = this.parseCompletion(response);
      return modelResponse;
    } catch (error) {
      this.logger.error('Failed to get response from Anthropic', error);
      if (error instanceof InferenceFailedError) {
        throw error;
      }
      throw new InferenceFailedError('Anthropic inference failed', {
        source: 'anthropic',
        originalError:
          error instanceof Error ? error : new Error('Unknown error'),
      });
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

  // Map messages to Anthropic.MessageParam
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
      const contentBlocks = message.content
        .map((content) => {
          if (content instanceof ThinkingMessageContent) {
            if (!content.signature) return null;
            return {
              type: 'thinking' as const,
              thinking: content.thinking,
              signature: content.signature,
            };
          }
          if (content instanceof TextMessageContent) {
            return {
              type: 'text' as const,
              text: content.text,
            };
          }
          if (content instanceof ToolUseMessageContent) {
            return {
              type: 'tool_use' as const,
              id: content.id,
              name: content.name,
              input: content.params,
            };
          }
          throw new Error(`Unknown message content type`);
        })
        .filter((block): block is NonNullable<typeof block> => block !== null);
      return {
        role: 'assistant',
        content: contentBlocks,
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

  protected parseCompletion = (
    response: Anthropic.Messages.Message,
  ): InferenceResponse => {
    this.logger.debug('parseCompletion', response);

    if (!response) {
      throw new InferenceFailedError('No completion returned from model', {
        source: 'anthropic',
      });
    }

    if (!['tool_use', 'end_turn'].includes(response.stop_reason || '')) {
      throw new InferenceFailedError(
        `Unexpected stop reason: ${response.stop_reason}`,
        {
          source: 'anthropic',
        },
      );
    }

    const modelResponseContent = response.content.map((c) => {
      if (c.type === 'thinking') {
        return new ThinkingMessageContent(c.thinking, null, c.signature);
      }
      if (c.type === 'tool_use') {
        return this.parseToolCall(c);
      } else if (c.type === 'text') {
        return new TextMessageContent(c.text);
      } else {
        throw new InferenceFailedError(
          `Invalid response content type: ${c.type}`,
          {
            source: 'anthropic',
          },
        );
      }
    });

    const modelResponse: InferenceResponse = {
      content: modelResponseContent,
      meta: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens:
          response.usage.input_tokens !== undefined &&
          response.usage.output_tokens !== undefined
            ? response.usage.input_tokens + response.usage.output_tokens
            : undefined,
      },
    };

    return modelResponse;
  };

  protected parseToolCall = (
    toolCall: Anthropic.Messages.ToolUseBlock,
  ): ToolUseMessageContent => {
    const id = toolCall.id;
    const name = toolCall.name;
    const parameters = toolCall.input as Record<string, unknown>;
    return new ToolUseMessageContent(id, name, parameters);
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
      throw new InferenceFailedError(
        `Unsupported user content type for Anthropic`,
        {
          source: 'anthropic',
        },
      );
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
