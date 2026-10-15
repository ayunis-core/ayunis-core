import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';

export function AlwaysActiveBadge({ testId }: Readonly<{ testId?: string }>) {
  const { t } = useTranslation('skills');
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" data-testid={testId}>
          {t('card.alwaysActive')}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {t('card.alwaysActiveTooltip')}
      </TooltipContent>
    </Tooltip>
  );
}
