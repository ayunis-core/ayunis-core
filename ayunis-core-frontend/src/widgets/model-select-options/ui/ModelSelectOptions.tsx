import { useEffect, useRef, useState } from 'react';
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
  MODEL_MODES,
  compareModels,
  getModeValue,
  resolveModeModel,
  type ModelMode,
} from '@/widgets/model-select-options/lib/model-modes';
import { stripProviderSuffix } from '@/widgets/model-select-options/lib/model-display-name';
import ModelModeIcon from './ModelModeIcon';
import ModelModeInfoCard from './ModelModeInfoCard';
import ModelInfoCard, { type ModelInfoModel } from './ModelInfoCard';
import ModelProviderFaultIndicator from './ModelProviderFaultIndicator';

export type ModelOption = ModelInfoModel & { id: string };

type HoveredOption = ModelOption | ModelMode;

interface ModelSelectOptionsProps {
  models: ModelOption[];
  showFlag?: boolean;
  showHeading?: boolean;
  showProviderFault?: boolean;
  showModes?: boolean;
}

export default function ModelSelectOptions({
  models,
  showFlag = false,
  showHeading = true,
  showProviderFault = false,
  showModes = false,
}: Readonly<ModelSelectOptionsProps>) {
  const { t } = useTranslation('common');
  const [hovered, setHovered] = useState<HoveredOption | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const sortedModels = [...models].sort(compareModels);
  const availableModes = MODEL_MODES.filter(
    (mode) => resolveModeModel(mode, models) !== undefined,
  );
  const hasModes = showModes && availableModes.length > 0;

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
                {availableModes.map((mode) => (
                  <SelectItem
                    key={mode}
                    value={getModeValue(mode)}
                    className="cursor-pointer"
                    onMouseEnter={() => showCardFor(mode)}
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
            resolvedModel={resolveModeModel(hovered, models)}
          />
        )}
        {hovered && typeof hovered !== 'string' && (
          <ModelInfoCard model={hovered} />
        )}
      </PopoverContent>
    </Popover>
  );
}
