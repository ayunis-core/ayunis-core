import { MessageContent } from 'src/domain/messages/domain/message-content.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { sanitizeUnicodeEscapes } from 'src/common/util/unicode-sanitizer';

/** Why a tool produced no real result although the call was well-formed. */
export type ToolResultOutcome = 'declined';

export class ToolResultMessageContent extends MessageContent {
  constructor(
    toolId: string,
    toolName: string,
    result: string,
    outcome?: ToolResultOutcome,
  ) {
    super(MessageContentType.TOOL_RESULT);
    this.toolId = toolId;
    this.toolName = toolName;
    // Sanitize result to handle invalid Unicode escape sequences
    this.result = sanitizeUnicodeEscapes(result);
    this.outcome = outcome;
  }

  public toolId: string;
  public toolName: string;
  public result: string;
  public readonly outcome?: ToolResultOutcome;
}
