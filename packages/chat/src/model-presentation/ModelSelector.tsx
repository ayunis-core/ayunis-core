import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import type {
  ModelModeResolutionResponseDto,
  PermittedLanguageModelResponseDto,
} from '@ayunis/api-client/schemas';
import { ProviderFlag } from './ProviderFlag';
import { getModeFromValue } from './model-modes';
import { stripProviderSuffix } from './model-display-name';
import {
  ModelSelectorMenu,
  type ModelSelectorMenuProps,
} from './ModelSelectorMenu';
import { ModeLabel } from './ModeLabel';
import './max-mode.css';

export interface ModelSelectorProps {
  readonly models: PermittedLanguageModelResponseDto[];
  readonly resolutions?: ModelModeResolutionResponseDto[];
  readonly modelListPresentation?: 'responsive' | 'submenu';
  readonly renderMenu?: (
    props: Omit<ModelSelectorMenuProps, 'resolutions'>,
  ) => ReactNode;
  readonly placeholder: string;
  isDisabled: boolean;
  isAnonymous: boolean;
  selectedModelId: string | undefined;
  onModelChange: (modelId: string) => void;
}

export function ModelSelector({
  models,
  resolutions = [],
  modelListPresentation = 'responsive',
  renderMenu,
  placeholder,
  isDisabled,
  isAnonymous,
  selectedModelId,
  onModelChange,
}: Readonly<ModelSelectorProps>) {
  const { t } = useTranslation('common');
  const isLocked = isDisabled || !selectedModelId;
  const menu = {
    models,
    modelListPresentation,
    selectedValue: selectedModelId,
    isAnonymous,
    onSelect: onModelChange,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isLocked}>
        <Button
          variant="ghost"
          size="sm"
          className="w-fit min-w-0 max-w-full justify-between"
          aria-label={t('chatInput.modelSelectorAriaLabel')}
          data-testid="chat-model-selector"
        >
          <ModelSelectorLabel
            models={models}
            value={selectedModelId}
            locked={isLocked}
            placeholder={placeholder}
          />
          <ChevronDown className="size-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <ModelPickerMenu
        resolutions={resolutions}
        renderMenu={renderMenu}
        menu={menu}
      />
    </DropdownMenu>
  );
}

function ModelPickerMenu({
  resolutions,
  renderMenu,
  menu,
}: Readonly<{
  resolutions: ModelModeResolutionResponseDto[];
  renderMenu: ModelSelectorProps['renderMenu'];
  menu: Omit<ModelSelectorMenuProps, 'resolutions'>;
}>) {
  return (
    <DropdownMenuContent
      align="end"
      sideOffset={4}
      collisionPadding={8}
      className="max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] min-w-[240px]"
      onCloseAutoFocus={(e) => e.preventDefault()}
    >
      {renderMenu ? (
        renderMenu(menu)
      ) : (
        <ModelSelectorMenu {...menu} resolutions={resolutions} />
      )}
    </DropdownMenuContent>
  );
}

function ModelSelectorLabel({
  models,
  value,
  locked,
  placeholder,
}: Readonly<{
  models: ModelSelectorProps['models'];
  value: string | undefined;
  locked: boolean;
  placeholder: string;
}>) {
  const { t } = useTranslation('common');
  const mode = getModeFromValue(value);
  const model = models.find(({ id }) => id === value);
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {mode && (
        <ModeLabel
          key={mode}
          mode={mode}
          label={t(`models.modes.${mode}.label`)}
          className="gap-1.5"
          withShimmer={!locked}
        />
      )}
      {!mode && model && (
        <>
          <ProviderFlag provider={model.provider} />
          <span className="truncate">
            {stripProviderSuffix(model.displayName)}
          </span>
        </>
      )}
      {!mode && !model && (
        <span className="text-muted-foreground">{placeholder}</span>
      )}
    </span>
  );
}
