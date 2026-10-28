import type { CSSProperties } from 'react';
import { cn } from '@ayunis/ui/lib/cn';
import {
  WORKSPACE_COLOR_TEXTS,
  WORKSPACE_COLOR_TINTS,
  isWorkspaceColorKey,
  WORKSPACE_ICONS,
  resolveWorkspaceIconKey,
} from '@/shared/lib/workspace-appearance';
import './workspace-icon.css';

type WorkspaceIconSize = 'sm' | 'md' | 'lg';
type WorkspaceIconVariant = 'tinted' | 'plain';

const SIZE_CLASSES: Record<WorkspaceIconSize, string> = {
  sm: 'size-6 [&>svg]:size-4',
  md: 'size-8 [&>svg]:size-5',
  lg: 'size-10 [&>svg]:size-6',
};

const RADIUS_CLASSES: Record<WorkspaceIconSize, string> = {
  sm: 'rounded-sm',
  md: 'rounded-sm',
  lg: 'rounded-md',
};

interface WorkspaceIconProps {
  icon: string;
  color: string;
  size?: WorkspaceIconSize;
  variant?: WorkspaceIconVariant;
  className?: string;
}

export function WorkspaceIcon({
  icon,
  color,
  size = 'sm',
  variant = 'tinted',
  className,
}: Readonly<WorkspaceIconProps>) {
  const Icon = WORKSPACE_ICONS[resolveWorkspaceIconKey(icon)];
  const tinted = variant === 'tinted';
  // Anything that is not a known palette key is treated as a custom colour, so
  // a value the backend accepted but this build does not know about still
  // renders instead of falling through to no colour at all.
  const custom = !isWorkspaceColorKey(color);
  const palette = tinted ? WORKSPACE_COLOR_TINTS : WORKSPACE_COLOR_TEXTS;

  return (
    <span
      aria-hidden="true"
      data-workspace-color={custom ? 'custom' : undefined}
      data-workspace-tint={tinted ? '' : undefined}
      style={
        custom ? ({ '--workspace-color': color } as CSSProperties) : undefined
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
