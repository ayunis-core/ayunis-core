import { useState } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { CheckIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/shared/ui/shadcn/popover';
import { SelectGroup, SelectLabel } from '@/shared/ui/shadcn/select';
import {
  getFlagByProvider,
  getHostingPriority,
} from '@/shared/lib/model-provider-metadata';
import ModelInfoCard, { type ModelInfoModel } from './ModelInfoCard';
import { getModelCategory } from '../lib/modelCategory';

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
  const sortedModels = [...models].sort(compareModels);

  return (
    <Popover open={!!hoveredModel}>
      <PopoverAnchor asChild>
        <div onMouseLeave={() => setHoveredModel(null)}>
          <SelectGroup>
            {showHeading && (
              <SelectLabel>{t('models.availableHeading')}</SelectLabel>
            )}
            {sortedModels.map((model) => {
              const name = stripProviderSuffix(model.displayName);
              const category = getModelCategory(model.tier);
              return (
                <SelectPrimitive.Item
                  key={model.id}
                  value={model.id}
                  onMouseEnter={() => setHoveredModel(model)}
                  className="focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <SelectPrimitive.ItemText>
                    {showFlag
                      ? `${getFlagByProvider(model.provider)} ${name}`
                      : name}
                  </SelectPrimitive.ItemText>
                  {category && (
                    <span className="text-muted-foreground text-xs">
                      {t(`models.category.${category}`)}
                    </span>
                  )}
                  <span className="absolute right-2 flex size-3.5 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <CheckIcon className="size-4" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                </SelectPrimitive.Item>
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
        className="pointer-events-none w-80"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {hoveredModel && <ModelInfoCard model={hoveredModel} />}
      </PopoverContent>
    </Popover>
  );
}
