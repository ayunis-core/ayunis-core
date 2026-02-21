import { MessageContent } from '../message-content.entity';
import { MessageContentType } from '../value-objects/message-content-type.object';
import { sanitizeUnicodeEscapes } from 'src/common/util/unicode-sanitizer';
import type { ProviderMetadata } from './provider-metadata.type';

export class TextMessageContent extends MessageContent {
  public text: string;
  public readonly providerMetadata: ProviderMetadata;
  public readonly isSkillInstruction: boolean;

  constructor(
    text: string,
    providerMetadata: ProviderMetadata = null,
    isSkillInstruction = false,
  ) {
    super(MessageContentType.TEXT);
    // Sanitize text to handle invalid Unicode escape sequences
    this.text = sanitizeUnicodeEscapes(text);
    this.providerMetadata = providerMetadata;
    this.isSkillInstruction = isSkillInstruction;
  }
}
