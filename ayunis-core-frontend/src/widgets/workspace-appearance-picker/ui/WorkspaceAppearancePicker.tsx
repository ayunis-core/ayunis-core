import { useTranslation } from 'react-i18next';
import { Check, Pipette } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Label } from '@ayunis/ui/components/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { cn } from '@ayunis/ui/lib/cn';
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import {
  DEFAULT_CUSTOM_WORKSPACE_COLOR,
  WORKSPACE_COLOR_ORDER,
  WORKSPACE_COLOR_SWATCHES,
  WORKSPACE_ICON_OPTIONS,
  isLightColor,
  isWorkspaceColorKey,
} from '@/shared/lib/workspace-appearance';

interface WorkspaceAppearancePickerProps {
  name: string;
  icon: string;
  color: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
}

export function WorkspaceAppearancePicker({
  name,
  icon,
  color,
  onIconChange,
  onColorChange,
}: Readonly<WorkspaceAppearancePickerProps>) {
  const { t } = useTranslation('workspaces');
  const isCustomSelected = !isWorkspaceColorKey(color);
  const customColor = isCustomSelected ? color : DEFAULT_CUSTOM_WORKSPACE_COLOR;
  const pipetteContrast = isLightColor(color) ? 'text-black' : 'text-white';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('appearance.iconLabel')}</Label>
        <div className="flex max-h-22 flex-wrap gap-1 overflow-y-auto rounded-md border p-2">
          {WORKSPACE_ICON_OPTIONS.map((option) => {
            const label = t(`appearance.icons.${option.key}`);
            return (
              <Tooltip key={option.key}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={icon === option.key ? 'secondary' : 'ghost'}
                    size="icon"
                    aria-label={label}
                    aria-pressed={icon === option.key}
                    onClick={() => onIconChange(option.key)}
                  >
                    <option.icon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('appearance.colorLabel')}</Label>
        <div className="flex flex-wrap items-center gap-2">
          {WORKSPACE_COLOR_ORDER.map((colorKey) => (
            <button
              key={colorKey}
              type="button"
              aria-label={t(`appearance.colors.${colorKey}`)}
              aria-pressed={color === colorKey}
              onClick={() => onColorChange(colorKey)}
              className={cn(
                'flex size-7 items-center justify-center rounded-full',
                WORKSPACE_COLOR_SWATCHES[colorKey],
              )}
            >
              {color === colorKey && (
                <Check className="size-4" strokeWidth={3} />
              )}
            </button>
          ))}

          {/* A native label, not the @ayunis/ui primitive: this control is a
              colour swatch, and restyling the library Label into one would
              fight its typography variants. The palette swatches above are
              plain buttons for the same reason. */}
          <label
            className="flex size-7 cursor-pointer items-center justify-center rounded-full border hover:bg-accent"
            style={isCustomSelected ? { backgroundColor: color } : undefined}
          >
            <span className="sr-only">{t('appearance.customColor')}</span>
            <Pipette
              className={cn(
                'size-3.5',
                isCustomSelected ? pipetteContrast : 'text-muted-foreground',
              )}
            />
            <input
              type="color"
              value={customColor}
              onChange={(event) => onColorChange(event.target.value)}
              className="sr-only"
            />
          </label>

          <div className="ml-auto flex items-center gap-2">
            <WorkspaceIcon icon={icon} color={color} size="md" />
            <span className="text-sm text-muted-foreground">
              {name.trim() || t('appearance.previewPlaceholder')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
