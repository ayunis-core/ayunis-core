import { MessageContent } from '../message-content.entity';
import { MessageContentType } from '../value-objects/message-content-type.object';
import { sanitizeUnicodeEscapes } from 'src/common/util/unicode-sanitizer';

export class ThinkingMessageContent extends MessageContent {
  public readonly thinking: string;
  public readonly id: string | null;
  public readonly signature: string | null;

  constructor(
    thinking: string,
    id: string | null = null,
    signature: string | null = null,
  ) {
    super(MessageContentType.THINKING);
    // Sanitize thinking content to handle invalid Unicode escape sequences
    this.thinking = sanitizeUnicodeEscapes(thinking);
    this.id = id;
    this.signature = signature;
  }
}
