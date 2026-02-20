import type {
  Tool as OllamaTool,
  Message as OllamaMessage,
  ToolCall as OllamaToolCall,
} from 'ollama';
import type { Tool } from 'src/domain/tools/domain/tool.entity';
import type { Message } from 'src/domain/messages/domain/message.entity';
import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import type { ImageContentService } from 'src/domain/messages/application/services/image-content.service';
import { InferenceFailedError } from '../../application/models.errors';
import { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';

/**
 * Shared message/tool conversion logic for Ollama,
 * used by both BaseOllamaInferenceHandler and BaseOllamaStreamInferenceHandler.
 */
export class OllamaMessageConverter {
  constructor(private readonly imageContentService?: ImageContentService) {}

  convertTool(tool: Tool): OllamaTool {
    return {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as Record<string, unknown>,
      },
    };
  }

  convertSystemPrompt(systemPrompt: string): OllamaMessage {
    return { role: 'system' as const, content: systemPrompt };
  }

  async convertMessages(
    messages: Message[],
    orgId: string,
  ): Promise<OllamaMessage[]> {
    const converted: OllamaMessage[] = [];
    for (const message of messages) {
      converted.push(...(await this.convertMessage(message, orgId)));
    }
    return converted;
  }

  async convertImageContent(
    content: ImageMessageContent,
    context: { orgId: string; threadId: string; messageId: string },
  ): Promise<string> {
    if (!this.imageContentService) {
      throw new InferenceFailedError(
        'Image converter not configured for image support',
        { source: 'ollama' },
      );
    }

    const imageData = await this.imageContentService.convertImageToBase64(
      content,
      context,
    );
    return imageData.base64;
  }

  private async convertMessage(
    message: Message,
    orgId: string,
  ): Promise<OllamaMessage[]> {
    if (message.role === MessageRole.USER)
      return this.convertUserMessage(message, orgId);
    if (message.role === MessageRole.ASSISTANT)
      return [this.convertAssistantMessage(message)];
    if (message.role === MessageRole.SYSTEM)
      return this.convertSystemMessage(message);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- guard for runtime safety
    if (message.role === MessageRole.TOOL)
      return this.convertToolMessage(message);
    return [];
  }

  private async convertUserMessage(
    message: Message,
    orgId: string,
  ): Promise<OllamaMessage[]> {
    const textParts: string[] = [];
    const images: string[] = [];
    for (const content of message.content) {
      if (content instanceof TextMessageContent) {
        textParts.push(content.text);
      }
      if (content instanceof ImageMessageContent) {
        const imageData = await this.convertImageContent(content, {
          orgId,
          threadId: message.threadId,
          messageId: message.id,
        });
        images.push(imageData);
      }
    }
    if (textParts.length === 0 && images.length === 0) return [];
    return [
      {
        role: 'user' as const,
        content: textParts.join('\n'),
        images: images.length > 0 ? images : undefined,
      },
    ];
  }

  private convertAssistantMessage(message: Message): OllamaMessage {
    let text: string | undefined;
    let thinking: string | undefined;
    const toolCalls: OllamaToolCall[] = [];
    for (const content of message.content) {
      if (content instanceof TextMessageContent) text = content.text;
      if (content instanceof ThinkingMessageContent)
        thinking = content.thinking;
      if (content instanceof ToolUseMessageContent) {
        toolCalls.push({
          function: { name: content.name, arguments: content.params },
        });
      }
    }
    return {
      role: 'assistant' as const,
      content: text ?? '',
      thinking,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  private convertSystemMessage(message: Message): OllamaMessage[] {
    return message.content
      .filter((c): c is TextMessageContent => c instanceof TextMessageContent)
      .map((c) => ({ role: 'system' as const, content: c.text }));
  }

  private convertToolMessage(message: Message): OllamaMessage[] {
    return message.content
      .filter(
        (c): c is ToolResultMessageContent =>
          c instanceof ToolResultMessageContent,
      )
      .map((c) => ({ role: 'tool' as const, content: c.result }));
  }
}
