import { cn } from '@/shared/lib/shadcn/utils';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';

/**
 * Placeholder shown while an artifact editor's lazy chunk loads. Sizing mirrors
 * the real editors so nothing shifts when the editor swaps in: 44px row-number
 * gutter and 45px/32px grid rows match RevoGrid's compact theme, and the
 * header, toolbar and version-history bars reuse the editors' own padding.
 */

// One more row than fills the tallest realistic panel; the grid area clips the
// overflow so the placeholder never ends in a blank strip.
const GRID_ROWS = Array.from({ length: 24 }, (_, index) => index);

function GridRow({ height }: { readonly height: string }) {
  return (
    <div className={cn('flex shrink-0 gap-px', height)}>
      <Skeleton className="h-full w-11 shrink-0 rounded-none" />
      <Skeleton className="h-full flex-1 rounded-none" />
      <Skeleton className="h-full flex-1 rounded-none" />
      <Skeleton className="h-full flex-1 rounded-none" />
    </div>
  );
}

interface ArtifactSidePanelSkeletonProps {
  /** Spreadsheets get a grid-shaped body; other editors get text lines. */
  readonly variant?: 'spreadsheet' | 'document';
}

export default function ArtifactSidePanelSkeleton({
  variant = 'document',
}: ArtifactSidePanelSkeletonProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden border-l">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <Skeleton className="h-5 w-44" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      <div className="flex items-center gap-1 border-b px-3 py-1.5">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-7 w-36" />
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-2">
        {variant === 'spreadsheet' ? (
          <div className="flex h-full flex-col gap-px">
            <GridRow height="h-11" />
            {GRID_ROWS.map((row) => (
              <GridRow key={row} height="h-[31px]" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
      </div>

      <div className="border-t px-3 py-2">
        <Skeleton className="h-5 w-44" />
      </div>
    </div>
  );
}
