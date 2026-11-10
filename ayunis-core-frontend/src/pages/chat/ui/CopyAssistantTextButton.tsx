import { copyableMessageContent } from '@/pages/chat/lib/copyable-message-content';
import CopyMessageButton from './CopyMessageButton';
import type { CopyableContent } from './CopyMessageButton';

interface CopyAssistantTextButtonProps {
  readonly contentRef: React.RefObject<HTMLDivElement | null>;
}

export default function CopyAssistantTextButton({
  contentRef,
}: CopyAssistantTextButtonProps) {
  const getContent = (): CopyableContent | null => {
    const el = contentRef.current;
    if (!el) return null;

    const copyableElements = el.querySelectorAll('[data-copyable="true"]');
    if (copyableElements.length === 0) return null;

    const htmlParts: string[] = [];
    const textParts: string[] = [];
    copyableElements.forEach((element) => {
      const content = copyableMessageContent(element);
      htmlParts.push(content.html);
      textParts.push(content.text);
    });

    return { html: htmlParts.join('<br><br>'), text: textParts.join('\n\n') };
  };

  return <CopyMessageButton getContent={getContent} />;
}
