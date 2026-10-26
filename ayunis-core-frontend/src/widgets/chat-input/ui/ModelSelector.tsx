import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { usePermittedModels } from '@/features/usePermittedModels';
import { ProviderFlag } from '@/shared/ui/provider-flag';
import {
  getModeFromValue,
  stripProviderSuffix,
} from '@/widgets/model-select-options';
import { ModelSelectorMenu } from './ModelSelectorMenu';
import { ModeLabel } from './ModeLabel';
import './max-mode.css';

interface ModelSelectorProps {
  isDisabled: boolean;
  isAnonymous: boolean;
  selectedModelId: string | undefined;
  onModelChange: (modelId: string) => void;
}

export default function ModelSelector({
  isDisabled,
  isAnonymous,
  selectedModelId,
  onModelChange,
}: Readonly<ModelSelectorProps>) {
  const { t } = useTranslation('common');
  const {
    models,
    placeholder,
    isDisabled: isDisabledModels,
  } = usePermittedModels();
  const selectedMode = getModeFromValue(selectedModelId);
  const selectedModel = models.find((model) => model.id === selectedModelId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        disabled={isDisabled || isDisabledModels || !selectedModelId}
      >
        <Button
          variant="ghost"
          size="sm"
          className="w-full min-w-0 max-w-full justify-between sm:w-fit"
          aria-label={t('chatInput.modelSelectorAriaLabel')}
          data-testid="chat-model-selector"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {selectedMode && (
              <ModeLabel
                key={selectedMode}
                mode={selectedMode}
                label={t(`models.modes.${selectedMode}.label`)}
                className="gap-1.5"
              />
            )}
            {!selectedMode && selectedModel && (
              <>
                <ProviderFlag provider={selectedModel.provider} />
                <span className="truncate">
                  {stripProviderSuffix(selectedModel.displayName)}
                </span>
              </>
            )}
            {!selectedMode && !selectedModel && (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="size-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={4}
        className="min-w-[240px]"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <ModelSelectorMenu
          models={models}
          selectedValue={selectedModelId}
          isAnonymous={isAnonymous}
          onSelect={onModelChange}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
