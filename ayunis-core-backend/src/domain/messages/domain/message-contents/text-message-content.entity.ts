import { MessageContent } from 'src/domain/messages/domain/message-content.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { sanitizeUnicodeEscapes } from 'src/common/util/unicode-sanitizer';
import type { ProviderMetadata } from './provider-metadata.type';

export class TextMessageContent extends MessageContent {
  public text: string;
  public readonly providerMetadata: ProviderMetadata;
  public readonly isSkillInstruction: boolean;
  /** Sent by the system to an unattended run that replied with text, not by the user. */
  public readonly isNudge: boolean;

  constructor(
    text: string,
    providerMetadata: ProviderMetadata = null,
    isSkillInstruction = false,
    isNudge = false,
  ) {
    super(MessageContentType.TEXT);
    // Sanitize text to handle invalid Unicode escape sequences
    this.text = sanitizeUnicodeEscapes(text);
    this.providerMetadata = providerMetadata;
    this.isSkillInstruction = isSkillInstruction;
    this.isNudge = isNudge;
  }
}
