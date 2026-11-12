import { MessageContent } from 'src/domain/messages/domain/message-content.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import type { ToolCallDecision } from 'src/domain/messages/domain/value-objects/tool-call-decision.object';
import { sanitizeUnicodeEscapes } from 'src/common/util/unicode-sanitizer';

export class ToolResultMessageContent extends MessageContent {
  constructor(
    toolId: string,
    toolName: string,
    result: string,
    decision?: ToolCallDecision,
  ) {
    super(MessageContentType.TOOL_RESULT);
    this.toolId = toolId;
    this.toolName = toolName;
    // Sanitize result to handle invalid Unicode escape sequences
    this.result = sanitizeUnicodeEscapes(result);
    this.decision = decision;
  }

  public toolId: string;
  public toolName: string;
  public result: string;
  /** Set when this result answers a call that required confirmation. */
  public decision?: ToolCallDecision;
}
