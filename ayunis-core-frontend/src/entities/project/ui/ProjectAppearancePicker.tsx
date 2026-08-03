import { Check, Palette } from 'lucide-react';
import { Label } from '@/shared/ui/shadcn/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { cn } from '@/shared/lib/shadcn/utils';
import {
  DEFAULT_CUSTOM_COLOR,
  PROJECT_COLOR_LABELS,
  PROJECT_COLOR_ORDER,
  PROJECT_COLOR_SWATCHES,
  PROJECT_ICON_OPTIONS,
  isCustomColor,
  isLightColor,
  type ProjectColor,
  type ProjectIconKey,
} from '../model/appearance';
import { ProjectIcon } from './ProjectIcon';

interface ProjectAppearancePickerProps {
  icon: ProjectIconKey;
  color: ProjectColor;
  onIconChange: (icon: ProjectIconKey) => void;
  onColorChange: (color: ProjectColor) => void;
}

export function ProjectAppearancePicker({
  icon,
  color,
  onIconChange,
  onColorChange,
}: Readonly<ProjectAppearancePickerProps>) {
  const custom = isCustomColor(color);
  const customTextClass = isLightColor(color)
    ? 'text-neutral-900'
    : 'text-white';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Symbol</Label>
        <div className="max-h-[5.5rem] overflow-y-auto">
          <div className="flex flex-wrap gap-1.5 py-1">
            {PROJECT_ICON_OPTIONS.map((option) => {
              const OptionIcon = option.icon;
              const isActive = option.key === icon;
              return (
                <Tooltip key={option.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onIconChange(option.key)}
                      aria-label={option.label}
                      aria-pressed={isActive}
                      className={cn(
                        'flex size-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none [&>svg]:size-4',
                        isActive && 'border-brand bg-brand/10 text-foreground',
                      )}
                    >
                      <OptionIcon />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{option.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Farbe</Label>
        <div className="flex flex-wrap items-center gap-2 py-0.5">
          {PROJECT_COLOR_ORDER.map((key) => (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onColorChange(key)}
                  aria-label={PROJECT_COLOR_LABELS[key]}
                  aria-pressed={key === color}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-white focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                    PROJECT_COLOR_SWATCHES[key],
                  )}
                >
                  {key === color && <Check className="size-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{PROJECT_COLOR_LABELS[key]}</TooltipContent>
            </Tooltip>
          ))}

          <Tooltip>
            <TooltipTrigger asChild>
              <label
                className={cn(
                  'relative flex size-7 cursor-pointer items-center justify-center rounded-full focus-within:ring-[3px] focus-within:ring-ring/50',
                  custom ? customTextClass : 'border text-muted-foreground',
                )}
                style={custom ? { backgroundColor: color } : undefined}
              >
                <input
                  type="color"
                  value={custom ? color : DEFAULT_CUSTOM_COLOR}
                  onChange={(event) =>
                    onColorChange(event.target.value as `#${string}`)
                  }
                  aria-label="Eigene Farbe"
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
                {custom ? (
                  <Check className="size-4" />
                ) : (
                  <Palette className="size-4" />
                )}
              </label>
            </TooltipTrigger>
            <TooltipContent>Eigene Farbe</TooltipContent>
          </Tooltip>

          <ProjectIcon icon={icon} color={color} size="md" className="ml-1" />
        </div>
      </div>
    </div>
  );
}
