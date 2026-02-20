import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { UserMessage } from 'src/domain/messages/domain/messages/user-message.entity';
import { AssistantMessage } from 'src/domain/messages/domain/messages/assistant-message.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { ToolResultMessage } from 'src/domain/messages/domain/messages/tool-result-message.entity';
import { SystemMessage } from 'src/domain/messages/domain/messages/system-message.entity';
import { ModelToolChoice } from '../../domain/value-objects/model-tool-choice.enum';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';

export interface BedrockAnthropicMessage {
  role: 'user' | 'assistant';
  content: BedrockAnthropicContent[];
}

export type BedrockAnthropicContent =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      source: { type: 'base64'; media_type: string; data: string };
    }
  | { type: 'tool_use'; id: string; name: string; input: object }
  | { type: 'tool_result'; tool_use_id: string; content: string }
  | { type: 'thinking'; thinking: string; signature: string };

export interface BedrockAnthropicTool {
  name: string;
  description: string;
  input_schema: object;
}

export interface BedrockAnthropicToolChoice {
  type: 'auto' | 'any' | 'tool';
  name?: string;
}

/**
 * Shared message/tool/toolChoice conversion for Bedrock (Anthropic API via AWS),
 * used by both BedrockInferenceHandler and BedrockStreamInferenceHandler.
 */
export class BedrockMessageConverter {
  constructor(private readonly imageContentService: ImageContentService) {}

  convertTool(tool: Tool): BedrockAnthropicTool {
    return {
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters as object,
    };
  }

  convertToolChoice(toolChoice: ModelToolChoice): BedrockAnthropicToolChoice {
    if (toolChoice === ModelToolChoice.AUTO) {
      return { type: 'auto' };
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- toolChoice can be a tool name string at runtime
    if (toolChoice === ModelToolChoice.REQUIRED) {
      return { type: 'any' };
    }
    return { type: 'tool', name: toolChoice };
  }

  async convertMessages(
    messages: Message[],
    orgId: string,
  ): Promise<BedrockAnthropicMessage[]> {
    const result: BedrockAnthropicMessage[] = [];

    for (const message of messages) {
      const converted = await this.convertMessage(message, orgId);

      if (result.length === 0) {
        result.push(converted);
        continue;
      }

      const lastMessage = result[result.length - 1];

      // Anthropic requires alternating user/assistant messages
      if (
        message.role === MessageRole.ASSISTANT ||
        lastMessage.role === 'assistant'
      ) {
        result.push(converted);
      } else {
        // Merge consecutive user messages
        lastMessage.content.push(...converted.content);
      }
    }

    return result;
  }

  private async convertMessage(
    message: Message,
    orgId: string,
  ): Promise<BedrockAnthropicMessage> {
    if (message instanceof UserMessage)
      return this.convertUserMessage(message, orgId);
    if (message instanceof AssistantMessage)
      return this.convertAssistantMessage(message);
    if (message instanceof ToolResultMessage)
      return this.convertToolResultMessage(message);
    if (message instanceof SystemMessage)
      return this.convertSystemMessage(message);
    throw new Error('Unknown message type');
  }

  private async convertUserMessage(
    message: UserMessage,
    orgId: string,
  ): Promise<BedrockAnthropicMessage> {
    const content: BedrockAnthropicContent[] = [];
    for (const c of message.content) {
      if (c instanceof TextMessageContent) {
        content.push({ type: 'text', text: c.text });
      } else if (c instanceof ImageMessageContent) {
        const imageData = await this.imageContentService.convertImageToBase64(
          c,
          { orgId, threadId: message.threadId, messageId: message.id },
        );
        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageData.contentType,
            data: imageData.base64,
          },
        });
      }
    }
    return { role: 'user', content };
  }

  private convertAssistantMessage(
    message: AssistantMessage,
  ): BedrockAnthropicMessage {
    const content: BedrockAnthropicContent[] = message.content
      .map((c): BedrockAnthropicContent | null => {
        if (c instanceof ThinkingMessageContent) {
          if (!c.signature) return null;
          return {
            type: 'thinking' as const,
            thinking: c.thinking,
            signature: c.signature,
          };
        }
        if (c instanceof TextMessageContent) {
          return { type: 'text' as const, text: c.text };
        }
        if (c instanceof ToolUseMessageContent) {
          return {
            type: 'tool_use' as const,
            id: c.id,
            name: c.name,
            input: c.params,
          };
        }
        throw new Error('Unknown assistant content type');
      })
      .filter((block): block is BedrockAnthropicContent => block !== null);
    return { role: 'assistant', content };
  }

  private convertToolResultMessage(
    message: ToolResultMessage,
  ): BedrockAnthropicMessage {
    const content: BedrockAnthropicContent[] = message.content.map((c) => ({
      type: 'tool_result' as const,
      tool_use_id: c.toolId,
      content: c.result,
    }));
    return { role: 'user', content };
  }

  private convertSystemMessage(
    message: SystemMessage,
  ): BedrockAnthropicMessage {
    const content: BedrockAnthropicContent[] = message.content.map((c) => ({
      type: 'text' as const,
      text: c.text,
    }));
    return { role: 'user', content };
  }
}
