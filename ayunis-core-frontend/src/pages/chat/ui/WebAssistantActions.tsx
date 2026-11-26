import type { RefObject } from 'react';
import type { AgentRunUnit } from '@ayunis/chat/timeline';
import { useAppChatSurface } from '@/features/chat-surface';
import ReadAloudButton from '@/pages/chat/ui/ReadAloudButton';
import { hasSpeakableText } from '@/pages/chat/lib/speakable-message-text';

export function WebAssistantActions({
  unit,
  contentRef,
}: Readonly<{
  unit: AgentRunUnit;
  contentRef: RefObject<HTMLDivElement | null>;
}>) {
  const { capabilities } = useAppChatSurface();
  const canRead =
    capabilities.readAloud &&
    !unit.isStreaming &&
    unit.blocks.some(
      (block) => block.kind === 'text' && hasSpeakableText(block.content.text),
    );
  return canRead ? (
    <ReadAloudButton messageKey={unit.key} contentRef={contentRef} />
  ) : null;
}
