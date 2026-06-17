import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { usePermittedModels } from '@/features/usePermittedModels';
import { ModelSelectOptions } from '@/widgets/model-select-options';
import { useTranslation } from 'react-i18next';

interface ModelSelectorProps {
  isDisabled: boolean;
  selectedModelId: string | undefined;
  onModelChange: (modelId: string) => void;
}

export default function ModelSelector({
  isDisabled,
  selectedModelId,
  onModelChange,
}: Readonly<ModelSelectorProps>) {
  const { t } = useTranslation('common');
  const {
    models,
    placeholder,
    isDisabled: isDisabledModels,
  } = usePermittedModels();
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
        <SelectValue placeholder={placeholder} />
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
