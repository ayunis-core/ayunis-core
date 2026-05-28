import { Button } from '@/shared/ui/shadcn/button';
import { ArrowUp, Square } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/shadcn/utils';

interface SendButtonProps {
  /** True while a submit is in flight (submitting or streaming). Replaces
   *  the send icon with a stop icon wired to {@link onCancel}. */
  inFlight: boolean;
  canSend: boolean;
  onSend: () => void;
  onCancel: () => void;
}

export function SendButton({
  inFlight,
  canSend,
  onSend,
  onCancel,
}: Readonly<SendButtonProps>) {
  const { t } = useTranslation('common');

  if (inFlight) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Button
              size="icon"
              className={cn(
                'chat-input-send-button chat-input-send-button--stop rounded-full',
              )}
              onClick={onCancel}
              aria-label={t('chatInput.cancelTooltip')}
            >
              <Square className="h-4 w-4" />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>{t('chatInput.cancelTooltip')}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <Button
            disabled={!canSend}
            className={cn(
              'chat-input-send-button rounded-full',
              canSend
                ? 'chat-input-send-button--ready'
                : 'chat-input-send-button--disabled',
            )}
            size="icon"
            data-testid="send"
            onClick={onSend}
            aria-label={t('chatInput.sendTooltip')}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent>{t('chatInput.sendTooltip')}</TooltipContent>
    </Tooltip>
  );
}
