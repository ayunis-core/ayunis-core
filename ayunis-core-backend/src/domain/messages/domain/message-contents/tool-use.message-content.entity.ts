import { MessageContent } from '../message-content.entity';
import { MessageContentType } from '../value-objects/message-content-type.object';
import { sanitizeObject } from 'src/common/util/unicode-sanitizer';

export class ToolUseMessageContent extends MessageContent {
  public id: string;
  public name: string;
  public params: Record<string, any>;

  constructor(
    id: string,
    name: string, // Not ToolNames because we want to allow org custom tools
    params: Record<string, any>,
  ) {
    super(MessageContentType.TOOL_USE);
    this.id = id;
    this.name = name;
    // Sanitize params to handle invalid Unicode escape sequences in nested strings
    this.params = sanitizeObject(params);
  }
}
