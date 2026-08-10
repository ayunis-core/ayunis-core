import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { usePermittedModels } from '@/features/usePermittedModels';
import { ModelSelectOptions } from '@/widgets/model-select-options';
import { ProviderFlag } from '@/shared/ui/provider-flag';
import { useTranslation } from 'react-i18next';

interface ModelSelectorProps {
  isDisabled: boolean;
  selectedModelId: string | undefined;
  onModelChange: (modelId: string) => void;
  /** In the Outlook task pane the toolbar is a `@container`. When it gets too
      narrow the model NAME collapses so only the (unchanged) provider flag
      remains — the icon itself is never swapped, just the label is hidden. */
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
        className="border-none shadow-none"
        disabled={isDisabled || isDisabledModels}
        aria-label={t('chatInput.modelSelectorAriaLabel')}
      >
        {responsiveLabel && selectedModel ? (
          <>
            <span className="contents @min-[24rem]:hidden">
              <ProviderFlag provider={selectedModel.provider} />
            </span>
            <span className="hidden @min-[24rem]:contents">
              <SelectValue placeholder={placeholder} />
            </span>
          </>
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
