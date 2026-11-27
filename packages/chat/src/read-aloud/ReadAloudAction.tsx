import type { RefObject } from 'react';
import type { AgentRunUnit } from '@ayunis/chat/timeline';
import ReadAloudButton from './ReadAloudButton';
import { hasSpeakableText } from './speakable-message-text';

/** Read aloud for a finished answer that has text to read. */
export function ReadAloudAction({
  unit,
  contentRef,
}: Readonly<{
  unit: AgentRunUnit;
  contentRef: RefObject<HTMLDivElement | null>;
}>) {
  const canRead =
    !unit.isStreaming &&
    unit.blocks.some(
      (block) => block.kind === 'text' && hasSpeakableText(block.content.text),
    );
  return canRead ? (
    <ReadAloudButton messageKey={unit.key} contentRef={contentRef} />
  ) : null;
}
