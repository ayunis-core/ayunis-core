import { getImageReferenceLabel } from 'src/domain/messages/application/utils/image-reference-label.util';
import type { MessagePart } from 'src/common/token-counter/application/util/context-budget.helper';
import { extractTextFromContent } from 'src/domain/messages/application/utils/message-text-extractor.util';
import { ImageMessageContent } from 'src/domain/messages/domain/message-contents/image-message-content.entity';
import type { Message } from 'src/domain/messages/domain/message.entity';

/**
 * A message as the inference mapper sends it: every image travels with its
 * reference label, so budgets and warnings price the same request.
 */
export function toBudgetParts(message: Message): MessagePart[] {
  return message.content.flatMap((content): MessagePart[] =>
    content instanceof ImageMessageContent
      ? [
          { kind: 'text', text: getImageReferenceLabel(content, message.id) },
          { kind: 'image' },
        ]
      : [{ kind: 'text', text: extractTextFromContent(content) }],
  );
}
