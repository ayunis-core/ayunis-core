import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';

interface InfoHintProps {
  label: string;
  hint: string;
  testId: string;
  showLabel?: boolean;
}

// The trigger is a real button so the explanation is reachable by keyboard, not
// hover only. Its accessible name names the row rather than repeating the hint,
// which Radix already exposes as the description via aria-describedby.
export function InfoHint({
  label,
  hint,
  testId,
  showLabel = true,
}: Readonly<InfoHintProps>) {
  const { t } = useTranslation('common');

  return (
    <span className="inline-flex items-center gap-1">
      {showLabel && label}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t('common.hintTriggerLabel', { label })}
            data-testid={testId}
          >
            <Info />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{hint}</TooltipContent>
      </Tooltip>
    </span>
  );
}
