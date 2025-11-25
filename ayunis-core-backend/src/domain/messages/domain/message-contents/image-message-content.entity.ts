import { MessageContent } from '../message-content.entity';
import { MessageContentType } from '../value-objects/message-content-type.object';
import { sanitizeUnicodeEscapes } from 'src/common/util/unicode-sanitizer';

export class ImageMessageContent extends MessageContent {
  public imageUrl: string;
  public altText?: string;

  constructor(imageUrl: string, altText?: string) {
    super(MessageContentType.IMAGE);
    // `imageUrl` is treated as an internal storage object identifier
    // (e.g. MinIO object name or `/storage/:objectName` path), not a
    // public internet URL. Validation happens at DTO / transport layer.
    // We don't sanitize URLs to avoid breaking valid encoded characters.
    this.imageUrl = imageUrl;

    this.altText = altText ? sanitizeUnicodeEscapes(altText) : undefined;
  }
}
