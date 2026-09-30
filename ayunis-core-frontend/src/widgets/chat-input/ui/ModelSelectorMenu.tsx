import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@ayunis/ui/lib/cn';
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import type { PermittedLanguageModelResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { ProviderFlag } from '@/shared/ui/provider-flag';
import {
  MODEL_MODES,
  ModelInfoCard,
  ModelModeInfoCard,
  ModelProviderFaultIndicator,
  compareModels,
  getModeValue,
  resolveModeModel,
  stripProviderSuffix,
  type ModelMode,
} from '@/widgets/model-select-options';
import { useHoverCard } from '@/widgets/chat-input/hooks/useHoverCard';
import { MenuHoverCard } from './MenuHoverCard';
import { ModeLabel } from './ModeLabel';

type Model = PermittedLanguageModelResponseDto;

interface ModelSelectorMenuProps {
  models: Model[];
  selectedValue: string | undefined;
  isAnonymous: boolean;
  onSelect: (value: string) => void;
}

function SelectedCheck({ isSelected }: Readonly<{ isSelected: boolean }>) {
  return <Check className={cn('ml-auto size-4', !isSelected && 'invisible')} />;
}

function ItemMeta({
  children,
  className,
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <span className={cn('text-xs text-muted-foreground', className)}>
      {children}
    </span>
  );
}

export function ModelSelectorMenu({
  models,
  selectedValue,
  isAnonymous,
  onSelect,
}: Readonly<ModelSelectorMenuProps>) {
  const { t } = useTranslation('common');
  const modeCard = useHoverCard<ModelMode>();
  const modelCard = useHoverCard<Model>();
  const availableModes = MODEL_MODES.filter(
    (mode) => resolveModeModel(mode, models, isAnonymous) !== undefined,
  );
  const sortedModels = [...models].sort(compareModels);

  return (
    <>
      {availableModes.length > 0 && (
        <>
          <MenuHoverCard
            card={
              modeCard.hovered && (
                <ModelModeInfoCard
                  mode={modeCard.hovered}
                  resolvedModel={resolveModeModel(
                    modeCard.hovered,
                    models,
                    isAnonymous,
                  )}
                />
              )
            }
            onCardEnter={modeCard.cancelClose}
            onLeave={modeCard.scheduleClose}
          >
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              {t('models.modes.heading')}
            </DropdownMenuLabel>
            {availableModes.map((mode) => (
              <DropdownMenuItem
                key={mode}
                className={cn(
                  'cursor-pointer',
                  mode === 'max' && 'max-mode-item overflow-hidden',
                )}
                onSelect={() => onSelect(getModeValue(mode))}
                onMouseEnter={() => modeCard.show(mode)}
              >
                {mode === 'max' && (
                  <span className="max-mode-item__pixels" aria-hidden="true" />
                )}
                <span className="max-mode-knockout inline-flex min-w-0 items-center gap-2">
                  <ModeLabel
                    mode={mode}
                    label={t(`models.modes.${mode}.label`)}
                    className="gap-2"
                  />
                  <ItemMeta className="max-mode-item__hint">
                    {t(`models.modes.${mode}.hint`)}
                  </ItemMeta>
                </span>
                <SelectedCheck
                  isSelected={selectedValue === getModeValue(mode)}
                />
              </DropdownMenuItem>
            ))}
          </MenuHoverCard>
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger
          className="cursor-pointer"
          onMouseEnter={modeCard.scheduleClose}
          data-testid="chat-model-selector-more-models"
        >
          {t('models.modes.moreModels')}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="min-w-[260px]">
          <MenuHoverCard
            card={
              modelCard.hovered && <ModelInfoCard model={modelCard.hovered} />
            }
            onCardEnter={modelCard.cancelClose}
            onLeave={modelCard.scheduleClose}
          >
            {sortedModels.map((model) => (
              <DropdownMenuItem
                key={model.id}
                className="cursor-pointer"
                data-testid="chat-model-selector-model"
                onSelect={() => onSelect(model.id)}
                onMouseEnter={() => modelCard.show(model)}
              >
                <ProviderFlag provider={model.provider} />
                {stripProviderSuffix(model.displayName)}
                {model.hasProviderFault && <ModelProviderFaultIndicator />}
                {model.tier && (
                  <ItemMeta>{t(`models.category.${model.tier}`)}</ItemMeta>
                )}
                <SelectedCheck isSelected={selectedValue === model.id} />
              </DropdownMenuItem>
            ))}
          </MenuHoverCard>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}
