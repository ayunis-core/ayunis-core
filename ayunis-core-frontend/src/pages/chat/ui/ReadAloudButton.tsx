import { Loader2, Square, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { useIsFeatureEnabled } from '@/features/feature-toggles';
import { useReadAloud } from '@/pages/chat/hooks/useReadAloud';
import { speakableMessageText } from '@/pages/chat/lib/speakable-message-text';

interface ReadAloudButtonProps {
  readonly messageKey: string;
  readonly contentRef: React.RefObject<HTMLDivElement | null>;
}

export default function ReadAloudButton({
  messageKey,
  contentRef,
}: ReadAloudButtonProps) {
  const { t } = useTranslation('chat');
  const readAloudEnabled = useIsFeatureEnabled('readAloudEnabled');
  const { status, toggle } = useReadAloud(messageKey);
  const label =
    status === 'idle' ? t('chat.readAloud') : t('chat.stopReadingAloud');

  if (!readAloudEnabled) return null;

  const handleClick = () => {
    toggle(() =>
      contentRef.current ? speakableMessageText(contentRef.current) : '',
    );
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 mt-1"
          onClick={handleClick}
          aria-label={label}
          aria-pressed={status !== 'idle'}
          data-testid="assistant-read-aloud"
          data-status={status}
        >
          {status === 'idle' && <Volume2 className="h-3.5 w-3.5" />}
          {status === 'loading' && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          {status === 'playing' && (
            <Square className="h-3.5 w-3.5 fill-current" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
