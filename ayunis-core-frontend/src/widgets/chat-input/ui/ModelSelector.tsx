import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { usePermittedModels } from '@/features/usePermittedModels';
import { getFlagByProvider } from '@/shared/lib/getFlagByProvider';
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
}: ModelSelectorProps) {
  const { t } = useTranslation('common');
  const {
    models,
    placeholder,
    isDisabled: isDisabledModels,
  } = usePermittedModels();
  const sortedModels = [...models].sort((a, b) => {
    const flagPriority: Record<string, number> = {
      '🇩🇪': 0,
      '🇪🇺': 1,
      '🇺🇸': 2,
    };

    const flagA = getFlagByProvider(a.provider);
    const flagB = getFlagByProvider(b.provider);
    const priorityA = flagPriority[flagA] ?? 3;
    const priorityB = flagPriority[flagB] ?? 3;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return a.displayName.localeCompare(b.displayName);
  });
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
      <SelectContent>
        {sortedModels.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {getFlagByProvider(model.provider)} {model.displayName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
