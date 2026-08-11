import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
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
  const customColor = isWorkspaceColorKey(color)
    ? DEFAULT_CUSTOM_WORKSPACE_COLOR
    : color;

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
                  <button
                    type="button"
                    aria-label={label}
                    aria-pressed={icon === option.key}
                    onClick={() => onIconChange(option.key)}
                    className={cn(
                      'flex size-9 items-center justify-center rounded-md border border-transparent hover:bg-accent',
                      icon === option.key && 'border-brand bg-brand/10',
                    )}
                  >
                    <option.icon className="size-4" />
                  </button>
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
                <Check className="size-4 text-white" strokeWidth={3} />
              )}
            </button>
          ))}

          {/* A native label, not the @ayunis/ui primitive: this control is a
              colour swatch, and restyling the library Label into one would
              fight its typography variants. The palette swatches above are
              plain buttons for the same reason. */}
          <label
            className="flex size-7 cursor-pointer items-center justify-center rounded-full border"
            style={{ backgroundColor: customColor }}
          >
            <span className="sr-only">{t('appearance.customColor')}</span>
            {!isWorkspaceColorKey(color) && (
              <Check
                className={cn(
                  'size-4',
                  isLightColor(color) ? 'text-black' : 'text-white',
                )}
                strokeWidth={3}
              />
            )}
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
