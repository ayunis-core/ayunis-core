import { useTranslation } from 'react-i18next';
import { Badge } from '@/shared/ui/shadcn/badge';
import { getFlagByProvider } from '@/shared/lib/getFlagByProvider';
import type { PermittedLanguageModelResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { getModelKey } from '../lib/getModelKey';

export type ModelInfoModel = Pick<
  PermittedLanguageModelResponseDto,
  'name' | 'provider' | 'displayName' | 'tier'
>;

interface ModelInfoCardProps {
  model: ModelInfoModel;
}

export default function ModelInfoCard({ model }: Readonly<ModelInfoCardProps>) {
  const { t } = useTranslation('common');

  const descriptionKey = getModelKey(model.name);
  const description = t(`models.descriptions.${descriptionKey}`, {
    defaultValue: t('models.descriptions.fallback'),
  });
  const hostingDetail = t(`models.providerHosting.${model.provider}`, {
    defaultValue: '',
  });
  const flag = getFlagByProvider(model.provider);

  const badges: string[] = [];
  if (model.tier) badges.push(t(`models.usage.${model.tier}`));

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-sm font-semibold">{model.displayName}</p>
        <p className="text-sm">{description}</p>
      </div>
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {badges.map((b) => (
            <Badge key={b} variant="secondary" className="font-normal">
              {b}
            </Badge>
          ))}
        </div>
      )}
      {hostingDetail && (
        <div className="border-t pt-3 text-xs text-muted-foreground">
          <p>
            <span aria-hidden="true">{flag} </span>
            {hostingDetail}
          </p>
        </div>
      )}
    </div>
  );
}
