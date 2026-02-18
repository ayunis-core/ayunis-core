import type { ArtifactVersionResponseDto } from '@/shared/api';
import { Button } from '@/shared/ui/shadcn/button';
import { ChevronDown, ChevronRight, History, RotateCcw } from 'lucide-react';
import { useState } from 'react';

interface VersionHistoryProps {
  versions: ArtifactVersionResponseDto[];
  currentVersionNumber: number;
  onRevert: (versionNumber: number) => void;
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
  onRevert,
}: VersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sortedVersions = [...versions].sort(
    (a, b) => b.versionNumber - a.versionNumber,
  );

  return (
    <div className="border-t">
      <button
        type="button"
        className="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-sm font-medium"
        onClick={() => setIsOpen(!isOpen)}
      >
        <History className="size-4" />
        <span>Version History ({versions.length})</span>
        {isOpen ? (
          <ChevronDown className="ml-auto size-4" />
        ) : (
          <ChevronRight className="ml-auto size-4" />
        )}
      </button>

      {isOpen && (
        <div className="max-h-48 overflow-y-auto px-3 pb-2">
          {sortedVersions.map((version) => (
            <div
              key={version.id}
              className="flex items-center justify-between rounded px-2 py-1.5 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  v{version.versionNumber}
                  {version.versionNumber === currentVersionNumber && (
                    <span className="text-muted-foreground ml-1">
                      (current)
                    </span>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">
                  {version.authorType} · {formatTimestamp(version.createdAt)}
                </span>
              </div>
              {version.versionNumber !== currentVersionNumber && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => onRevert(version.versionNumber)}
                  title={`Revert to v${version.versionNumber}`}
                >
                  <RotateCcw className="mr-1 size-3" />
                  Revert
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
