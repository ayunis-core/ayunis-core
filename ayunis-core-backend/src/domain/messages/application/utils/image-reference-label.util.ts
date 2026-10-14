import type { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';

// Inference images carry no id, so a text label lets tools reference the upload.
export function getImageReferenceLabel(
  content: ImageMessageContent,
  messageId: string,
): string {
  return `[image ref: ${content.getReferenceId(messageId)}]`;
}
