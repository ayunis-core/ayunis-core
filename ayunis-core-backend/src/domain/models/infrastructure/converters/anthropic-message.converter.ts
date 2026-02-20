import type Anthropic from '@anthropic-ai/sdk';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import type {
  ToolChoiceAny,
  ToolChoiceAuto,
  ToolChoiceTool,
} from '@anthropic-ai/sdk/resources/messages';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { InferenceFailedError } from 'src/domain/models/application/models.errors';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';

type AnthropicToolChoice = ToolChoiceAny | ToolChoiceAuto | ToolChoiceTool;

/**
 * Shared message/tool/toolChoice conversion logic for Anthropic,
 * used by both BaseAnthropicInferenceHandler and BaseAnthropicStreamInferenceHandler.
 */
export class AnthropicMessageConverter {
  constructor(private readonly imageContentService: ImageContentService) {}

  convertTool(tool: Tool): Anthropic.Tool {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as Anthropic.Messages.Tool.InputSchema,
    };
  }

  async convertMessages(
    messages: Message[],
    orgId: string,
  ): Promise<Anthropic.MessageParam[]> {
    const chatMessages = await messages.reduce<
      Promise<Anthropic.MessageParam[]>
    >(
      async (accPromise, message) => {
        const convertedMessages = await accPromise;
        if (convertedMessages.length === 0) {
          convertedMessages.push(await this.convertMessage(message, orgId));
          return convertedMessages;
        }
        const lastMessage = convertedMessages.pop();
        if (!lastMessage) {
          throw new Error('lastMessage is undefined');
        }
        if (
          message.role === MessageRole.ASSISTANT ||
          lastMessage.role === (MessageRole.ASSISTANT as string)
        ) {
          convertedMessages.push(lastMessage);
          convertedMessages.push(await this.convertMessage(message, orgId));
          return convertedMessages;
        }

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
  }

  convertToolChoice(toolChoice: ModelToolChoice): AnthropicToolChoice {
    if (toolChoice === ModelToolChoice.AUTO) {
      return { type: 'auto' };
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- toolChoice can be a tool name string at runtime
    if (toolChoice === ModelToolChoice.REQUIRED) {
      throw new Error("Tool choice 'required' is not supported in Anthropic");
    }
    return { type: 'tool', name: toolChoice };
  }

  async convertUserContent(
    content: TextMessageContent | ImageMessageContent,
    context: { orgId: string; threadId: string; messageId: string },
  ): Promise<Anthropic.ImageBlockParam | Anthropic.TextBlockParam> {
    if (content instanceof TextMessageContent) {
      return { type: 'text', text: content.text };
    }

    if (!(content instanceof ImageMessageContent)) {
      throw new InferenceFailedError(
        `Unsupported user content type for Anthropic`,
        { source: 'anthropic' },
      );
    }

    return this.convertImageContent(content, context);
  }

  async convertImageContent(
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

  private async convertMessage(
    message: Message,
    orgId: string,
  ): Promise<Anthropic.MessageParam> {
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
      return this.convertAssistantMessage(message);
    }
    if (message instanceof ToolResultMessage) {
      return {
        role: 'user',
        content: message.content.map((content) => ({
          type: 'tool_result' as const,
          tool_use_id: content.toolId,
          content: content.result,
        })),
      };
    }
    if (message instanceof SystemMessage) {
      return {
        role: 'user',
        content: message.content.map((content) => ({
          type: 'text' as const,
          text: content.text,
        })),
      };
    }
    throw new Error(`Unknown message type`);
  }

  private convertAssistantMessage(
    message: AssistantMessage,
  ): Anthropic.MessageParam {
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
          return { type: 'text' as const, text: content.text };
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
    return { role: 'assistant', content: contentBlocks };
  }
}
