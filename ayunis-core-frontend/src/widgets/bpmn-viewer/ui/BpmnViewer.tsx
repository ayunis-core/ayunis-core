import { useRef, useState } from 'react';
import type NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';
import type { ArtifactResponseDto } from '@/shared/api';
import { VersionHistory } from '@/widgets/artifact-editor';
import { ArtifactPanelHeader } from '@/widgets/artifact-panel-header';
import { BpmnCanvas } from './BpmnCanvas';
import { BpmnExportButtons } from './BpmnExportButtons';

interface BpmnViewerProps {
  readonly artifact: ArtifactResponseDto;
  readonly onClose: () => void;
  readonly onBack: () => void;
  readonly showClose?: boolean;
}

export function BpmnViewer({
  artifact,
  onClose,
  onBack,
  showClose = true,
}: BpmnViewerProps) {
  // null follows the latest version; resets on artifact change via key prop.
  const [userSelectedVersion, setUserSelectedVersion] = useState<number | null>(
    null,
  );
  const viewerRef = useRef<NavigatedViewer | null>(null);

  const displayedVersionNumber =
    userSelectedVersion ?? artifact.currentVersionNumber;
  const xml =
    artifact.versions?.find((v) => v.versionNumber === displayedVersionNumber)
      ?.content ?? '';

  return (
    <div className="flex h-full flex-col overflow-hidden border-l">
      <ArtifactPanelHeader
        title={
          <h3 className="truncate text-sm font-semibold" title={artifact.title}>
            {artifact.title}
          </h3>
        }
        actions={
          <BpmnExportButtons
            xml={xml}
            viewerRef={viewerRef}
            fileName={artifact.title}
          />
        }
        onBack={onBack}
        onClose={onClose}
        showClose={showClose}
      />

      <div className="flex-1 overflow-hidden">
        <BpmnCanvas xml={xml} viewerRef={viewerRef} />
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
