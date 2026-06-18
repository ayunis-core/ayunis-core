import React from 'react';
import { cn } from '@/shared/lib/shadcn/utils';

interface CenteredContentLayoutProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Vertically scrollable, horizontally centered content column.
 * Used by hero-style pages where the content has a constrained width
 * and lives above background layers (e.g. ShimmerDots on getting-started).
 *
 * Override `max-w-*` or padding via `className` if needed.
 */
export default function CenteredContentLayout({
  children,
  className,
}: Readonly<CenteredContentLayoutProps>) {
  return (
    <div
      className={cn(
        'relative z-10 max-w-2xl mx-auto py-8 px-4 space-y-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
