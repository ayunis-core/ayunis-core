import { MessageContent } from '../message-content.entity';
import { MessageContentType } from '../value-objects/message-content-type.object';

export class ThinkingMessageContent extends MessageContent {
  constructor(public readonly thinking: string) {
    super(MessageContentType.THINKING);
  }
}
