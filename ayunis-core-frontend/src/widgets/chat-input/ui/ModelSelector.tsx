import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { usePermittedModels } from '@/features/usePermittedModels';
import { ModelSelectOptions } from '@/widgets/model-select-options';
import { stripProviderSuffix } from '@/shared/lib/model-provider-metadata';
import { ProviderFlag } from '@/shared/ui/provider-flag';
import { useTranslation } from 'react-i18next';

interface ModelSelectorProps {
  isDisabled: boolean;
  selectedModelId: string | undefined;
  onModelChange: (modelId: string) => void;
  responsiveLabel?: boolean;
}

export default function ModelSelector({
  isDisabled,
  selectedModelId,
  onModelChange,
  responsiveLabel = false,
}: Readonly<ModelSelectorProps>) {
  const { t } = useTranslation('common');
  const {
    models,
    placeholder,
    isDisabled: isDisabledModels,
  } = usePermittedModels();
  const selectedModel = models.find((m) => m.id === selectedModelId);
  return (
    <Select
      value={selectedModelId}
      onValueChange={onModelChange}
      disabled={isDisabled || isDisabledModels || !selectedModelId}
    >
      <SelectTrigger
        className="max-w-[12rem] border-none shadow-none"
        disabled={isDisabled || isDisabledModels}
        aria-label={t('chatInput.modelSelectorAriaLabel')}
      >
        {responsiveLabel && selectedModel ? (
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <ProviderFlag provider={selectedModel.provider} />
            <span className="hidden truncate @min-[24rem]:inline">
              {stripProviderSuffix(selectedModel.displayName)}
            </span>
          </span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={4}
        align="end"
        className="min-w-[260px]"
      >
        <ModelSelectOptions models={models} showFlag />
      </SelectContent>
    </Select>
  );
}
