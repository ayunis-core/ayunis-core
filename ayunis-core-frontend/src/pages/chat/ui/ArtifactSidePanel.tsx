import { lazy, Suspense } from 'react';
import type { ArtifactResponseDto } from '@/shared/api';
import type { ArtifactsControllerExportFormat } from '@/shared/api/generated/ayunisCoreAPI.schemas';

const LazyArtifactEditor = lazy(() =>
  import('@/widgets/artifact-editor').then((m) => ({
    default: m.ArtifactEditor,
  })),
);

const LazyDiagramViewer = lazy(() =>
  import('@/widgets/diagram-viewer').then((m) => ({
    default: m.DiagramViewer,
  })),
);

const LazySpreadsheetEditor = lazy(() =>
  import('@/widgets/spreadsheet-editor').then((m) => ({
    default: m.SpreadsheetEditor,
  })),
);

interface ArtifactSidePanelProps {
  readonly artifact: ArtifactResponseDto;
  readonly onSave: (content: string) => void;
  readonly onRevert: (versionNumber: number) => void;
  readonly onExport: (
    format: ArtifactsControllerExportFormat,
    unsavedContent?: string,
  ) => void;
  readonly onClose: () => void;
  readonly onLetterheadChange: (letterheadId: string | null) => void;
  readonly isExporting?: boolean;
}

export function ArtifactSidePanel({
  artifact,
  onSave,
  onRevert,
  onExport,
  onClose,
  onLetterheadChange,
  isExporting,
}: ArtifactSidePanelProps) {
  const panel = () => {
    switch (artifact.type) {
      case 'diagram':
        return <LazyDiagramViewer artifact={artifact} onClose={onClose} />;
      case 'spreadsheet':
        return (
          <LazySpreadsheetEditor
            artifact={artifact}
            onSave={onSave}
            onRevert={onRevert}
            onExport={onExport}
            onClose={onClose}
            isExporting={isExporting}
          />
        );
      case 'document':
        return (
          <LazyArtifactEditor
            artifact={artifact}
            onSave={onSave}
            onRevert={onRevert}
            onExport={onExport}
            onClose={onClose}
            onLetterheadChange={onLetterheadChange}
            isExporting={isExporting}
          />
        );
    }
  };

  return <Suspense fallback={null}>{panel()}</Suspense>;
}
