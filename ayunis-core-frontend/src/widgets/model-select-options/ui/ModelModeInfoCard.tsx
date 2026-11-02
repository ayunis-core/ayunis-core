import { useTranslation } from 'react-i18next';
import { ProviderFlag } from '@/shared/ui/provider-flag';
import type { ModelMode } from '@/widgets/model-select-options/lib/model-modes';
import type { ModelInfoModel } from './ModelInfoCard';
import ModelModeIcon from './ModelModeIcon';

interface ModelModeInfoCardProps {
  mode: ModelMode;
  resolvedModel: ModelInfoModel | undefined;
}

export default function ModelModeInfoCard({
  mode,
  resolvedModel,
}: Readonly<ModelModeInfoCardProps>) {
  const { t } = useTranslation('common');

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <ModelModeIcon mode={mode} />
          <p className="text-sm font-semibold">
            {t(`models.modes.${mode}.label`)}
          </p>
        </div>
        <p className="text-sm">{t(`models.modes.${mode}.description`)}</p>
      </div>
      {resolvedModel && (
        <div className="-mx-4 border-t px-4 pt-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            {t('models.modes.current')}
            <ProviderFlag provider={resolvedModel.provider} />
            <span className="text-foreground">{resolvedModel.displayName}</span>
          </p>
        </div>
      )}
    </div>
  );
}
