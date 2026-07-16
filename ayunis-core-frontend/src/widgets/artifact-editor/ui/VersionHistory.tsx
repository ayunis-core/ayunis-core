import type { ArtifactVersionResponseDto } from '@/shared/api';
import { Button } from '@/shared/ui/shadcn/button';
import { ChevronDown, ChevronRight, History, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/shadcn/utils';

interface VersionHistoryProps {
  readonly versions: ArtifactVersionResponseDto[];
  readonly currentVersionNumber: number;
  /**
   * Shows a "Revert" button next to non-current versions. When omitted, no
   * revert action is offered (used by the read-only diagram viewer).
   */
  readonly onRevert?: (versionNumber: number) => void;
  /**
   * When provided, each version's details are clickable and call this with the
   * selected version number (used by the diagram viewer for navigation). The
   * row matching `selectedVersionNumber` (falling back to
   * `currentVersionNumber`) is highlighted.
   */
  readonly onSelect?: (versionNumber: number) => void;
  /**
   * The version currently displayed when it can differ from the artifact's
   * current version (history browsing). Only affects the row highlight; the
   * "(current)" label and Revert visibility follow `currentVersionNumber`.
   */
  readonly selectedVersionNumber?: number;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function VersionHistory({
  versions,
  currentVersionNumber,
  selectedVersionNumber,
  onRevert,
  onSelect,
}: VersionHistoryProps) {
  const { t } = useTranslation('artifacts');
  const [isOpen, setIsOpen] = useState(false);

  const sortedVersions = useMemo(
    () => [...versions].sort((a, b) => b.versionNumber - a.versionNumber),
    [versions],
  );

  return (
    <div className="border-t">
      <button
        type="button"
        className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-sm font-medium"
        onClick={() => setIsOpen(!isOpen)}
      >
        <History className="size-4" />
        <span>{t('versionHistory.title', { count: versions.length })}</span>
        {isOpen ? (
          <ChevronDown className="ml-auto size-4" />
        ) : (
          <ChevronRight className="ml-auto size-4" />
        )}
      </button>

      {isOpen && (
        <div className="max-h-48 overflow-y-auto px-3 pb-2">
          {sortedVersions.map((version) => {
            const isCurrent = version.versionNumber === currentVersionNumber;
            const isSelected =
              version.versionNumber ===
              (selectedVersionNumber ?? currentVersionNumber);
            const versionDetails = (
              <span className="flex min-w-0 flex-1 flex-col items-start">
                <span className="text-sm font-medium">
                  v{version.versionNumber}
                  {isCurrent && (
                    <span className="text-muted-foreground ml-1">
                      {t('versionHistory.current')}
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">
                  {version.authorType} · {formatTimestamp(version.createdAt)}
                </span>
              </span>
            );
            const revertButton = onRevert && !isCurrent && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => onRevert(version.versionNumber)}
                title={t('versionHistory.revertTo', {
                  version: version.versionNumber,
                })}
              >
                <RotateCcw className="mr-1 size-3" />
                {t('versionHistory.revert')}
              </Button>
            );

            return (
              <div
                key={version.id}
                className={cn(
                  'flex items-center justify-between rounded px-2 py-1.5 text-sm',
                  isSelected && 'bg-muted',
                )}
              >
                {onSelect ? (
                  <button
                    type="button"
                    className="hover:bg-muted min-w-0 flex-1 text-left"
                    onClick={() => onSelect(version.versionNumber)}
                  >
                    {versionDetails}
                  </button>
                ) : (
                  versionDetails
                )}
                {revertButton}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
