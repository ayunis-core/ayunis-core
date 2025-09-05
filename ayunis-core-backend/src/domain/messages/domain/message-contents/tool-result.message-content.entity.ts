import { MessageContent } from '../message-content.entity';
import { MessageContentType } from '../value-objects/message-content-type.object';
import { sanitizeUnicodeEscapes } from 'src/common/util/unicode-sanitizer';

export class ToolResultMessageContent extends MessageContent {
  constructor(toolId: string, toolName: string, result: string) {
    super(MessageContentType.TOOL_RESULT);
    this.toolId = toolId;
    this.toolName = toolName;
    // Sanitize result to handle invalid Unicode escape sequences
    this.result = sanitizeUnicodeEscapes(result);
  }

  public toolId: string;
  public toolName: string;
  public result: string;
}
