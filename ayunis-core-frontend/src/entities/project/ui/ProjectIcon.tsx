import type { CSSProperties } from 'react';
import { cn } from '@/shared/lib/shadcn/utils';
import {
  PROJECT_COLOR_TEXTS,
  PROJECT_COLOR_TINTS,
  PROJECT_ICONS,
  isCustomColor,
  type ProjectColor,
  type ProjectIconKey,
} from '../model/appearance';
import './project-icon.css';

type ProjectIconSize = 'sm' | 'md' | 'lg';
type ProjectIconVariant = 'tinted' | 'plain';

const SIZE_CLASSES: Record<ProjectIconSize, string> = {
  sm: 'size-6 [&>svg]:size-4',
  md: 'size-8 [&>svg]:size-5',
  lg: 'size-10 [&>svg]:size-6',
};

const RADIUS_CLASSES: Record<ProjectIconSize, string> = {
  sm: 'rounded-sm',
  md: 'rounded-sm',
  lg: 'rounded-md',
};

interface ProjectIconProps {
  icon: ProjectIconKey;
  color: ProjectColor;
  size?: ProjectIconSize;
  variant?: ProjectIconVariant;
  className?: string;
}

export function ProjectIcon({
  icon,
  color,
  size = 'sm',
  variant = 'tinted',
  className,
}: Readonly<ProjectIconProps>) {
  const Icon = PROJECT_ICONS[icon];
  const custom = isCustomColor(color);
  const tinted = variant === 'tinted';
  const palette = tinted ? PROJECT_COLOR_TINTS : PROJECT_COLOR_TEXTS;
  return (
    <span
      aria-hidden="true"
      data-project-color={custom ? 'custom' : undefined}
      data-project-tint={tinted ? '' : undefined}
      style={
        custom ? ({ '--project-color': color } as CSSProperties) : undefined
      }
      className={cn(
        'flex shrink-0 items-center justify-center',
        SIZE_CLASSES[size],
        tinted && RADIUS_CLASSES[size],
        !custom && palette[color],
        className,
      )}
    >
      <Icon className="text-current" />
    </span>
  );
}
