import { ModelWithConfigResponseDtoTier } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { Star } from 'lucide-react';
import { cn } from '@/shared/lib/shadcn/utils';

const TIER_FILLED_COUNT: Record<ModelWithConfigResponseDtoTier, number> = {
  [ModelWithConfigResponseDtoTier.zero]: 0,
  [ModelWithConfigResponseDtoTier.low]: 1,
  [ModelWithConfigResponseDtoTier.medium]: 2,
  [ModelWithConfigResponseDtoTier.high]: 3,
};

interface ModelTierStarsProps {
  readonly tier: ModelWithConfigResponseDtoTier;
}

export function TierStars({ tier }: ModelTierStarsProps) {
  const filled = TIER_FILLED_COUNT[tier];
  return (
    <span className="inline-flex items-center" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <Star
          key={index}
          className={cn(
            'h-3 w-3',
            index < filled
              ? 'fill-current text-foreground'
              : 'fill-none text-muted-foreground',
          )}
        />
      ))}
    </span>
  );
}

export function ModelTierStars({ tier }: ModelTierStarsProps) {
  const { t } = useTranslation('common');
  const performance = t(`models.tierPerformance.${tier}`);
  const usage = t(`models.tierUsage.${tier}`);
  const tierLabel = `${performance} · ${usage}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="ml-1 inline-flex items-center align-middle"
          aria-label={tierLabel}
          tabIndex={0}
        >
          <TierStars tier={tier} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{tierLabel}</TooltipContent>
    </Tooltip>
  );
}
