import { MessageContent } from '../message-content.entity';
import { MessageContentType } from '../value-objects/message-content-type.object';
import { sanitizeUnicodeEscapes } from 'src/common/util/unicode-sanitizer';

export class ThinkingMessageContent extends MessageContent {
  public readonly thinking: string;
  constructor(thinking: string) {
    super(MessageContentType.THINKING);
    // Sanitize thinking content to handle invalid Unicode escape sequences
    this.thinking = sanitizeUnicodeEscapes(thinking);
  }
}
