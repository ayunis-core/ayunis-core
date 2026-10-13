import { MessageContent } from 'src/domain/messages/domain/message-content.entity';
import { MessageContentType } from 'src/domain/messages/domain/value-objects/message-content-type.object';
import { sanitizeUnicodeEscapes } from 'src/common/util/unicode-sanitizer';
import { getImageStoragePath } from 'src/domain/messages/domain/image-storage-path.util';

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
   * The text handle sent next to the image so the model can refer to it, for
   * example when passing it to the image generation tool.
   */
  getReferenceLabel(messageId: string): string {
    return `[image ref: ${messageId}:${this.index}]`;
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
