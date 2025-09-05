import { MessageContent } from '../message-content.entity';
import { MessageContentType } from '../value-objects/message-content-type.object';
import { sanitizeUnicodeEscapes } from 'src/common/util/unicode-sanitizer';

export class TextMessageContent extends MessageContent {
  public text: string;
  constructor(text: string) {
    super(MessageContentType.TEXT);
    // Sanitize text to handle invalid Unicode escape sequences
    this.text = sanitizeUnicodeEscapes(text);
  }
}
