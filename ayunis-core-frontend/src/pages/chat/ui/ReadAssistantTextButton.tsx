import { Loader2, Square, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { useReadOutLoud } from '../api/useReadOutLoud';

interface ReadAssistantTextButtonProps {
  readonly contentRef: React.RefObject<HTMLDivElement | null>;
}

function extractSpeakableText(container: HTMLElement): string {
  const parts: string[] = [];
  container.querySelectorAll('[data-copyable="true"]').forEach((element) => {
    // Read block-level children individually so code blocks can be
    // skipped — listening to raw code read aloud is useless
    Array.from(element.children).forEach((child) => {
      if (child.tagName === 'PRE') return;
      const text = (child as HTMLElement).innerText.trim();
      if (text) parts.push(text);
    });
  });
  return parts.join('\n\n').trim();
}

export default function ReadAssistantTextButton({
  contentRef,
}: ReadAssistantTextButtonProps) {
  const { t } = useTranslation('chat');
  const { status, start, stop } = useReadOutLoud();

  const handleClick = () => {
    if (status !== 'idle') {
      stop();
      return;
    }
    const el = contentRef.current;
    if (!el) return;
    const text = extractSpeakableText(el);
    if (!text) return;
    void start(text);
  };

  const label =
    status === 'idle' ? t('chat.readOutLoud') : t('chat.stopReading');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 mt-1"
          onClick={handleClick}
          aria-label={label}
        >
          {status === 'loading' && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          {status === 'playing' && <Square className="h-3.5 w-3.5" />}
          {status === 'idle' && <Volume2 className="h-3.5 w-3.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
