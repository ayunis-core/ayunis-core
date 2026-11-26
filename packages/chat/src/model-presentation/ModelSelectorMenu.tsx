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
import type {
  ModelModeResolutionResponseDto,
  PermittedLanguageModelResponseDto,
} from '@ayunis/api-client/schemas';
import { ProviderFlag } from './ProviderFlag';
import {
  MODEL_MODES,
  compareModels,
  getModeValue,
  resolveModeModel,
  type ModelMode,
} from './model-modes';
import { stripProviderSuffix } from './model-display-name';
import ModelInfoCard from './ModelInfoCard';
import ModelModeInfoCard from './ModelModeInfoCard';
import ModelProviderFaultIndicator from './ModelProviderFaultIndicator';
import { useIsMobile } from '@ayunis/ui/hooks/use-mobile';
import { useHoverCard } from './use-hover-card';
import { MenuHoverCard } from './MenuHoverCard';
import { ModeLabel } from './ModeLabel';

type Model = PermittedLanguageModelResponseDto;

export interface ModelSelectorMenuProps {
  models: Model[];
  resolutions: ModelModeResolutionResponseDto[];
  modelListPresentation?: 'responsive' | 'submenu';
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

type MenuChoice = Pick<ModelSelectorMenuProps, 'selectedValue' | 'onSelect'>;

export function ModelSelectorMenu(props: Readonly<ModelSelectorMenuProps>) {
  const isMobile = useIsMobile();
  const modeCard = useHoverCard<ModelMode>();
  const {
    models,
    resolutions,
    isAnonymous,
    modelListPresentation = 'responsive',
  } = props;
  const resolve = (mode: ModelMode) =>
    resolveModeModel(mode, models, resolutions, isAnonymous);
  const availableModes = MODEL_MODES.filter((mode) => resolve(mode));
  const modelList = <ProviderModelOptions {...props} />;
  if (!availableModes.length) return modelList;

  return (
    <>
      <ModelModeOptions
        {...props}
        availableModes={availableModes}
        resolve={resolve}
        card={modeCard}
      />
      <DropdownMenuSeparator />
      {isMobile && modelListPresentation === 'responsive' ? (
        modelList
      ) : (
        <MoreModels closeModeCard={modeCard.scheduleClose}>
          {modelList}
        </MoreModels>
      )}
    </>
  );
}

function ProviderModelOptions({
  models,
  selectedValue,
  onSelect,
}: Readonly<MenuChoice & { models: Model[] }>) {
  const { t } = useTranslation('common');
  const card = useHoverCard<Model>();
  return (
    <MenuHoverCard
      card={card.hovered && <ModelInfoCard model={card.hovered} />}
      onCardEnter={card.cancelClose}
      onLeave={card.scheduleClose}
    >
      {[...models].sort(compareModels).map((model) => (
        <DropdownMenuItem
          key={model.id}
          className="cursor-pointer"
          data-testid="chat-model-selector-model"
          onSelect={() => onSelect(model.id)}
          onMouseEnter={() => card.show(model)}
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
  );
}

function ModelModeOptions({
  availableModes,
  resolve,
  card,
  selectedValue,
  onSelect,
}: Readonly<
  MenuChoice & {
    availableModes: ModelMode[];
    resolve: (mode: ModelMode) => Model | undefined;
    card: ReturnType<typeof useHoverCard<ModelMode>>;
  }
>) {
  const { t } = useTranslation('common');
  return (
    <MenuHoverCard
      card={
        card.hovered && (
          <ModelModeInfoCard
            mode={card.hovered}
            resolvedModel={resolve(card.hovered)}
          />
        )
      }
      onCardEnter={card.cancelClose}
      onLeave={card.scheduleClose}
    >
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
        {t('models.modes.heading')}
      </DropdownMenuLabel>
      {availableModes.map((mode) => (
        <ModelModeChoice
          key={mode}
          mode={mode}
          onHover={card.show}
          selectedValue={selectedValue}
          onSelect={onSelect}
        />
      ))}
    </MenuHoverCard>
  );
}

function ModelModeChoice({
  mode,
  onHover,
  onSelect,
  selectedValue,
}: Readonly<
  MenuChoice & {
    mode: ModelMode;
    onHover: (mode: ModelMode) => void;
  }
>) {
  const { t } = useTranslation('common');
  const value = getModeValue(mode);
  return (
    <DropdownMenuItem
      className={cn(
        'cursor-pointer',
        mode === 'max' && 'max-mode-item overflow-hidden',
      )}
      data-testid={`chat-model-selector-mode-${mode}`}
      onSelect={() => onSelect(value)}
      onMouseEnter={() => onHover(mode)}
    >
      {mode === 'max' && (
        <span className="max-mode-item__pixels" aria-hidden="true" />
      )}
      <span className="max-mode-knockout inline-flex min-w-0 items-center gap-2">
        <ModeLabel
          mode={mode}
          label={t(`models.modes.${mode}.label`)}
          className="gap-2"
          withShimmer
        />
        <ItemMeta className="max-mode-item__hint">
          {t(`models.modes.${mode}.hint`)}
        </ItemMeta>
      </span>
      <SelectedCheck isSelected={selectedValue === value} />
    </DropdownMenuItem>
  );
}

function MoreModels({
  closeModeCard,
  children,
}: Readonly<{ closeModeCard: () => void; children: ReactNode }>) {
  const { t } = useTranslation('common');
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger
        className="cursor-pointer"
        onMouseEnter={closeModeCard}
        data-testid="chat-model-selector-more-models"
      >
        {t('models.modes.moreModels')}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        collisionPadding={8}
        className="max-h-(--radix-dropdown-menu-content-available-height) min-w-[260px] overflow-auto"
      >
        {children}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
