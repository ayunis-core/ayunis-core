import { MessageContent } from '../message-content.entity';
import { MessageContentType } from '../value-objects/message-content-type.object';
import { sanitizeUnicodeEscapes } from 'src/common/util/unicode-sanitizer';
import { getImageStoragePath } from '../image-storage-path.util';

/**
 * Represents image content in a message.
 * Stores index and contentType; storage path is computed on demand.
 */
export class ImageMessageContent extends MessageContent {
  public readonly index: number;
  public readonly contentType: string;
  public readonly altText?: string;

  constructor(index: number, contentType: string, altText?: string) {
    super(MessageContentType.IMAGE);
    this.index = index;
    this.contentType = contentType;
    this.altText = altText ? sanitizeUnicodeEscapes(altText) : undefined;
  }

  /**
   * Computes the storage path for this image.
   * Path format: <orgId>/<threadId>/<messageId>/<index>.<ext>
   */
  getStoragePath(orgId: string, threadId: string, messageId: string): string {
    return getImageStoragePath({
      orgId,
      threadId,
      messageId,
      index: this.index,
      contentType: this.contentType,
    });
  }
}
