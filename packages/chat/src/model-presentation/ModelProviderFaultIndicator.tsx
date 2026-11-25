import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';

export default function ModelProviderFaultIndicator() {
  const { t } = useTranslation('common');
  const warning = t('models.providerFaultWarning');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label={warning}
          data-testid="model-provider-fault-indicator"
          className="inline-flex shrink-0 text-warning [[data-slot=select-value]_&]:hidden"
        >
          <TriangleAlert aria-hidden="true" className="size-4" />
        </span>
      </TooltipTrigger>
      <TooltipContent data-testid="model-provider-fault-tooltip">
        {warning}
      </TooltipContent>
    </Tooltip>
  );
}
