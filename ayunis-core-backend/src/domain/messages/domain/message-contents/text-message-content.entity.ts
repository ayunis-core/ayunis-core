import { MessageContent } from '../message-content.entity';
import { MessageContentType } from '../value-objects/message-content-type.object';

export class TextMessageContent extends MessageContent {
  constructor(public text: string) {
    super(MessageContentType.TEXT);
  }
}
