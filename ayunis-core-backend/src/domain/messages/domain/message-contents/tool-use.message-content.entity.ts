import { MessageContent } from '../message-content.entity';
import { MessageContentType } from '../value-objects/message-content-type.object';

export class ToolUseMessageContent extends MessageContent {
  constructor(
    public id: string,
    public name: string, // Not ToolNames because we want to allow org custom tools
    public params: Record<string, any>,
  ) {
    super(MessageContentType.TOOL_USE);
  }
}
