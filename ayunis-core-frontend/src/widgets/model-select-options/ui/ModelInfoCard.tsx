import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import { ProviderFlag } from '@/shared/ui/provider-flag';
import { TierStars } from '@/widgets/model-type-card';
import type { PermittedLanguageModelResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export type ModelInfoModel = Pick<
  PermittedLanguageModelResponseDto,
  'name' | 'provider' | 'displayName' | 'tier' | 'description'
> &
  Partial<Pick<PermittedLanguageModelResponseDto, 'hasProviderFault'>>;

interface ModelInfoCardProps {
  model: ModelInfoModel;
}

export default function ModelInfoCard({ model }: Readonly<ModelInfoCardProps>) {
  const { t } = useTranslation('common');

  const description = model.description?.trim();
  const hostingDetail = t(`models.providerHosting.${model.provider}`, {
    defaultValue: '',
  });

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold">{model.displayName}</p>
          {model.tier && <TierStars tier={model.tier} />}
        </div>
        {description && <p className="text-sm">{description}</p>}
      </div>
      {model.tier && (
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="font-normal">
            {t(`models.tierPerformance.${model.tier}`)}
          </Badge>
          <Badge variant="secondary" className="font-normal">
            {t(`models.tierUsage.${model.tier}`)}
          </Badge>
        </div>
      )}
      {hostingDetail && (
        <div className="border-t pt-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <ProviderFlag provider={model.provider} />
            {hostingDetail}
          </p>
        </div>
      )}
    </div>
  );
}
