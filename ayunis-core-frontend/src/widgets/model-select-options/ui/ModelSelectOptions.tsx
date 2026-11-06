import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type SyntheticEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@ayunis/ui/components/popover';
import {
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
} from '@ayunis/ui/components/select';
import { ProviderFlag } from '@/shared/ui/provider-flag';
import {
  compareModels,
  getModeValue,
  type ModelMode,
} from '@/widgets/model-select-options/lib/model-modes';
import { stripProviderSuffix } from '@/widgets/model-select-options/lib/model-display-name';
import ModelModeIcon from './ModelModeIcon';
import ModelModeInfoCard from './ModelModeInfoCard';
import ModelInfoCard, { type ModelInfoModel } from './ModelInfoCard';
import ModelProviderFaultIndicator from './ModelProviderFaultIndicator';

export type ModelOption = ModelInfoModel & { id: string };

type HoveredOption = ModelOption | ModelMode;

export interface ModeOption {
  mode: ModelMode;
  /** Model the mode currently resolves to; shown in the hover card. */
  resolvedModel?: ModelInfoModel;
  disabled?: boolean;
}

const preventSelection = (event: SyntheticEvent) => event.preventDefault();

function preventKeyboardSelection(event: KeyboardEvent<HTMLElement>) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
  }
}

interface ModelSelectOptionsProps {
  models: ModelOption[];
  showFlag?: boolean;
  showHeading?: boolean;
  showProviderFault?: boolean;
  /** Modes listed above the individual models, in this order. */
  modes?: ModeOption[];
  modesHint?: string;
}

export default function ModelSelectOptions({
  models,
  showFlag = false,
  showHeading = true,
  showProviderFault = false,
  modes = [],
  modesHint,
}: Readonly<ModelSelectOptionsProps>) {
  const { t } = useTranslation('common');
  const [hovered, setHovered] = useState<HoveredOption | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const modesHintId = useId();
  const sortedModels = [...models].sort(compareModels);
  const hasModes = modes.length > 0;

  const cancelScheduledClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  // Grace period so the cursor can travel from the list into the card
  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimerRef.current = window.setTimeout(() => setHovered(null), 150);
  };

  const showCardFor = (option: HoveredOption) => {
    cancelScheduledClose();
    setHovered(option);
  };

  useEffect(() => cancelScheduledClose, []);

  return (
    <Popover open={!!hovered}>
      <PopoverAnchor asChild>
        <div onMouseLeave={scheduleClose}>
          <SelectGroup>
            {showHeading && !hasModes && (
              <SelectLabel>{t('models.availableHeading')}</SelectLabel>
            )}
            {hasModes && (
              <>
                {modes.map(({ mode, disabled }) => (
                  <SelectItem
                    key={mode}
                    value={getModeValue(mode)}
                    aria-disabled={disabled || undefined}
                    aria-describedby={
                      disabled && modesHint ? modesHintId : undefined
                    }
                    className="cursor-pointer aria-disabled:cursor-default aria-disabled:opacity-50"
                    onMouseEnter={() => showCardFor(mode)}
                    onFocus={() => showCardFor(mode)}
                    onBlur={scheduleClose}
                    onClick={disabled ? preventSelection : undefined}
                    onPointerUp={disabled ? preventSelection : undefined}
                    onKeyDown={disabled ? preventKeyboardSelection : undefined}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <ModelModeIcon mode={mode} />
                      {t(`models.modes.${mode}.label`)}
                    </span>
                    <span className="text-muted-foreground text-xs [[data-slot=select-value]_&]:hidden">
                      {t(`models.modes.${mode}.hint`)}
                    </span>
                  </SelectItem>
                ))}
                {modesHint && (
                  <p
                    id={modesHintId}
                    className="w-0 min-w-full px-2 py-1.5 text-xs text-muted-foreground"
                  >
                    {modesHint}
                  </p>
                )}
                <SelectSeparator />
                {showHeading && (
                  <SelectLabel>
                    {t('models.modes.otherModelsHeading')}
                  </SelectLabel>
                )}
              </>
            )}
            {sortedModels.map((model) => {
              const name = stripProviderSuffix(model.displayName);
              return (
                <SelectItem
                  key={model.id}
                  className="cursor-pointer"
                  value={model.id}
                  onMouseEnter={() => showCardFor(model)}
                >
                  {showFlag ? (
                    <span className="inline-flex items-center gap-1.5">
                      <ProviderFlag provider={model.provider} />
                      {name}
                    </span>
                  ) : (
                    name
                  )}
                  {showProviderFault && model.hasProviderFault && (
                    <ModelProviderFaultIndicator />
                  )}
                  {model.tier && (
                    // Radix portals the item text into the closed trigger;
                    // hide the tier label there so only the name shows.
                    <span className="text-muted-foreground text-xs [[data-slot=select-value]_&]:hidden">
                      {t(`models.category.${model.tier}`)}
                    </span>
                  )}
                </SelectItem>
              );
            })}
          </SelectGroup>
        </div>
      </PopoverAnchor>
      <PopoverContent
        side="left"
        align="start"
        sideOffset={12}
        alignOffset={-4}
        // pointer-events-auto so hovering the card keeps it open while the
        // Radix Select locks pointer events on the body
        className="pointer-events-auto w-80"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onMouseEnter={cancelScheduledClose}
        onMouseLeave={scheduleClose}
      >
        {typeof hovered === 'string' && (
          <ModelModeInfoCard
            mode={hovered}
            resolvedModel={
              modes.find((option) => option.mode === hovered)?.resolvedModel
            }
          />
        )}
        {hovered && typeof hovered !== 'string' && (
          <ModelInfoCard model={hovered} />
        )}
      </PopoverContent>
    </Popover>
  );
}
