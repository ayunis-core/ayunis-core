import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/shared/ui/shadcn/popover';
import {
  SelectGroup,
  SelectItem,
  SelectLabel,
} from '@/shared/ui/shadcn/select';
import {
  getFlagByProvider,
  getHostingPriority,
} from '@/shared/lib/model-provider-metadata';
import ModelInfoCard, { type ModelInfoModel } from './ModelInfoCard';

export type ModelOption = ModelInfoModel & { id: string };

const TIER_RANK: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
  zero: 0,
};

function compareModels(a: ModelOption, b: ModelOption): number {
  const hostingA = getHostingPriority(a.provider);
  const hostingB = getHostingPriority(b.provider);
  if (hostingA !== hostingB) return hostingA - hostingB;

  const tierA = TIER_RANK[a.tier ?? ''] ?? -1;
  const tierB = TIER_RANK[b.tier ?? ''] ?? -1;
  if (tierA !== tierB) return tierB - tierA;

  return a.displayName.localeCompare(b.displayName);
}

function stripProviderSuffix(displayName: string): string {
  const openIndex = displayName.lastIndexOf('(');
  if (openIndex > 0 && displayName.trimEnd().endsWith(')')) {
    return displayName.slice(0, openIndex).trimEnd();
  }
  return displayName;
}

interface ModelSelectOptionsProps {
  models: ModelOption[];
  showFlag?: boolean;
  showHeading?: boolean;
}

export default function ModelSelectOptions({
  models,
  showFlag = false,
  showHeading = true,
}: Readonly<ModelSelectOptionsProps>) {
  const { t } = useTranslation('common');
  const [hoveredModel, setHoveredModel] = useState<ModelOption | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const sortedModels = [...models].sort(compareModels);

  const cancelScheduledClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  // Grace period so the cursor can travel from the list into the card
  const scheduleClose = () => {
    cancelScheduledClose();
    closeTimerRef.current = window.setTimeout(() => setHoveredModel(null), 150);
  };

  useEffect(() => cancelScheduledClose, []);

  return (
    <Popover open={!!hoveredModel}>
      <PopoverAnchor asChild>
        <div onMouseLeave={scheduleClose}>
          <SelectGroup>
            {showHeading && (
              <SelectLabel>{t('models.availableHeading')}</SelectLabel>
            )}
            {sortedModels.map((model) => {
              const name = stripProviderSuffix(model.displayName);
              return (
                <SelectItem
                  key={model.id}
                  value={model.id}
                  onMouseEnter={() => {
                    cancelScheduledClose();
                    setHoveredModel(model);
                  }}
                >
                  {showFlag
                    ? `${getFlagByProvider(model.provider)} ${name}`
                    : name}
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
        {hoveredModel && <ModelInfoCard model={hoveredModel} />}
      </PopoverContent>
    </Popover>
  );
}
