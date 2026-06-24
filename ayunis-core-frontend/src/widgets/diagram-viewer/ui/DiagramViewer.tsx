import type { ArtifactResponseDto } from '@/shared/api';
import { Button } from '@/shared/ui/shadcn/button';
import { X } from 'lucide-react';
import { useRef, useState } from 'react';
import { MermaidRenderer } from './MermaidRenderer';
import { DiagramExportButtons } from './DiagramExportButtons';
import { VersionHistory } from '@/widgets/artifact-editor';

interface DiagramViewerProps {
  readonly artifact: ArtifactResponseDto;
  readonly onClose: () => void;
}

export function DiagramViewer({ artifact, onClose }: DiagramViewerProps) {
  // null = follow latest; set to a specific version number when the user
  // picks one from the history. Resets on artifact change via key prop.
  const [userSelectedVersion, setUserSelectedVersion] = useState<number | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const displayedVersionNumber =
    userSelectedVersion ?? artifact.currentVersionNumber;

  const selectedVersion = artifact.versions?.find(
    (v) => v.versionNumber === displayedVersionNumber,
  );

  return (
    <div className="flex h-full flex-col overflow-hidden border-l">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="truncate text-sm font-semibold" title={artifact.title}>
          {artifact.title}
        </h3>
        <div className="flex items-center gap-1">
          <DiagramExportButtons
            containerRef={containerRef}
            fileName={artifact.title}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <MermaidRenderer
          source={selectedVersion?.content ?? ''}
          containerRef={containerRef}
        />
      </div>

      {artifact.versions && artifact.versions.length > 0 && (
        <VersionHistory
          versions={artifact.versions}
          currentVersionNumber={displayedVersionNumber}
          onSelect={(v) =>
            setUserSelectedVersion(
              v === artifact.currentVersionNumber ? null : v,
            )
          }
        />
      )}
    </div>
  );
}
