import type { ArtifactResponseDto } from '@/shared/api';
import { useRef, useState } from 'react';
import { MermaidRenderer } from './MermaidRenderer';
import { DiagramExportButtons } from './DiagramExportButtons';
import { VersionHistory } from '@/widgets/artifact-editor';
import { ArtifactPanelHeader } from '@/widgets/artifact-panel-header';

interface DiagramViewerProps {
  readonly artifact: ArtifactResponseDto;
  readonly onClose: () => void;
  readonly onBack: () => void;
  readonly showClose?: boolean;
}

export function DiagramViewer({
  artifact,
  onClose,
  onBack,
  showClose = true,
}: DiagramViewerProps) {
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
      <ArtifactPanelHeader
        title={
          <h3 className="truncate text-sm font-semibold" title={artifact.title}>
            {artifact.title}
          </h3>
        }
        actions={
          <DiagramExportButtons
            containerRef={containerRef}
            fileName={artifact.title}
          />
        }
        onBack={onBack}
        onClose={onClose}
        showClose={showClose}
      />

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
