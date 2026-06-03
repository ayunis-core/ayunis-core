import { Button } from '@/shared/ui/shadcn/button';
import { ArrowUp, Square } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { useTranslation } from 'react-i18next';

interface SendButtonProps {
  inFlight: boolean;
  canSend: boolean;
  onSend: () => void;
  onCancel: () => void;
}

const brandIconButtonClasses =
  'rounded-full border border-transparent bg-brand text-brand-foreground hover:bg-brand/90';

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
              className={brandIconButtonClasses}
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
            className={brandIconButtonClasses}
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
