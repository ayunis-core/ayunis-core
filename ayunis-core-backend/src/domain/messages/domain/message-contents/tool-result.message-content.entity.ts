import { MessageContent } from '../message-content.entity';
import { MessageContentType } from '../value-objects/message-content-type.object';

export class ToolResultMessageContent extends MessageContent {
  constructor(
    public toolId: string,
    public toolName: string,
    public result: string,
  ) {
    super(MessageContentType.TOOL_RESULT);
  }
}
