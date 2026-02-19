import type { MessageContent } from '../../domain/message-content.entity';
import { MessageContentType } from '../../domain/value-objects/message-content-type.object';
import type { TextMessageContent } from '../../domain/message-contents/text-message-content.entity';
import type { ThinkingMessageContent } from '../../domain/message-contents/thinking-message-content.entity';
import type { ToolUseMessageContent } from '../../domain/message-contents/tool-use.message-content.entity';
import type { ToolResultMessageContent } from '../../domain/message-contents/tool-result.message-content.entity';

/**
 * Extracts text content from a message content entity for token counting purposes.
 * Returns empty string for content types that don't have meaningful text (e.g., images).
 */
export function extractTextFromContent(content: MessageContent): string {
  const typedContent = content as { type: MessageContentType };

  switch (typedContent.type) {
    case MessageContentType.TEXT:
      return (content as TextMessageContent).text;

    case MessageContentType.THINKING:
      return (content as ThinkingMessageContent).thinking;

    case MessageContentType.TOOL_USE: {
      const toolUse = content as ToolUseMessageContent;
      return `${toolUse.id} ${toolUse.name} ${JSON.stringify(toolUse.params)}`;
    }

    case MessageContentType.TOOL_RESULT: {
      const toolResult = content as ToolResultMessageContent;
      return `${toolResult.toolId} ${toolResult.toolName} ${toolResult.result}`;
    }

    case MessageContentType.IMAGE:
      // Images have fixed token cost based on dimensions, not text-based
      return '';

    default:
      return '';
  }
}

/**
 * Extracts all text from a message's content array and joins it.
 */
export function extractTextFromMessage(content: MessageContent[]): string {
  return content
    .map((c) => extractTextFromContent(c))
    .filter((text) => text.length > 0)
    .join('\n');
}
