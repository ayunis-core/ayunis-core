import { forwardRef, lazy, Suspense, useImperativeHandle, useRef } from 'react';
import { isAxiosError } from 'axios';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';
import type { ArtifactResponseDto } from '@/shared/api';
import type { ArtifactsControllerExportFormat } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { ArtifactPanelHeader } from '@/widgets/artifact-panel-header';
import ArtifactPanelSkeleton from './ArtifactPanelSkeleton';

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

interface ArtifactPanelProps {
  readonly artifact: ArtifactResponseDto | null;
  readonly isLoading?: boolean;
  readonly error?: unknown;
  readonly onRetry: () => void;
  readonly onSave: (content: string) => void | Promise<void>;
  readonly onRevert: (versionNumber: number) => void;
  readonly onExport: (
    format: ArtifactsControllerExportFormat,
    unsavedContent?: string,
    versionNumber?: number,
  ) => void;
  readonly onClose?: () => void;
  readonly onBack?: () => void;
  readonly onLetterheadChange: (letterheadId: string | null) => void;
  readonly isExporting?: boolean;
  readonly showClose?: boolean;
}

export const ArtifactPanel = forwardRef<
  ArtifactPanelHandle,
  ArtifactPanelProps
>(function ArtifactPanel(
  {
    artifact,
    isLoading = false,
    error,
    onRetry,
    onSave,
    onRevert,
    onExport,
    onClose,
    onBack,
    onLetterheadChange,
    isExporting,
    showClose = true,
  },
  ref,
) {
  const { t } = useTranslation('artifacts');
  const editorRef = useRef<ArtifactPanelHandle>(null);
  useImperativeHandle(ref, () => ({
    requestExit: (onExit, onStay) => {
      if (editorRef.current) {
        editorRef.current.requestExit(onExit, onStay);
        return;
      }
      onExit();
    },
  }));
  const hasArtifactNotFoundError =
    isAxiosError(error) && error.response?.status === 404;
  const hasArtifactLoadError = Boolean(error) && !hasArtifactNotFoundError;

  if (!artifact) {
    if (isLoading) {
      return (
        <ArtifactPanelSkeleton
          onClose={onClose}
          onBack={onBack}
          showClose={showClose}
        />
      );
    }

    return (
      <aside
        className="flex h-full min-h-0 flex-col overflow-hidden border-l bg-background"
        data-testid="artifact-side-panel-error"
      >
        <ArtifactPanelHeader
          title={
            <h2 className="truncate text-sm font-semibold">
              {t('panel.title')}
            </h2>
          }
          onBack={onBack}
          onClose={onClose}
          showClose={showClose}
        />
        <div className="flex flex-1 items-start p-4">
          <Alert variant="warning">
            <AlertTriangle />
            <AlertTitle
              data-testid={
                hasArtifactNotFoundError
                  ? 'artifact-side-panel-not-found'
                  : 'artifact-side-panel-load-error'
              }
            >
              {t(
                hasArtifactLoadError
                  ? 'panel.loadErrorTitle'
                  : 'panel.notFoundTitle',
              )}
            </AlertTitle>
            <AlertDescription>
              {t(
                hasArtifactLoadError
                  ? 'panel.loadErrorDescription'
                  : 'panel.notFoundDescription',
              )}
              {hasArtifactLoadError && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  data-testid="artifact-side-panel-retry"
                  onClick={onRetry}
                >
                  {t('panel.retry')}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </aside>
    );
  }

  // key={artifact.id} forces a remount when another artifact is opened: the
  // editors keep local state (grid data, dirty flag, selected version) that
  // must not leak from one artifact to the next.
  const panel = () => {
    switch (artifact.type) {
      case 'diagram':
        return (
          <LazyDiagramViewer
            key={artifact.id}
            artifact={artifact}
            onClose={onClose}
            onBack={onBack}
            showClose={showClose}
          />
        );
      case 'spreadsheet':
        return (
          <LazySpreadsheetEditor
            ref={editorRef}
            key={artifact.id}
            artifact={artifact}
            onSave={onSave}
            onRevert={onRevert}
            onExport={onExport}
            onClose={onClose}
            onBack={onBack}
            isExporting={isExporting}
            showClose={showClose}
          />
        );
      case 'document':
        return (
          <LazyArtifactEditor
            ref={editorRef}
            key={artifact.id}
            artifact={artifact}
            onSave={onSave}
            onRevert={onRevert}
            onExport={onExport}
            onClose={onClose}
            onBack={onBack}
            onLetterheadChange={onLetterheadChange}
            isExporting={isExporting}
            showClose={showClose}
          />
        );
    }
  };

  return (
    <Suspense
      fallback={
        <ArtifactPanelSkeleton
          variant={artifact.type === 'spreadsheet' ? 'spreadsheet' : 'document'}
          onClose={onClose}
          onBack={onBack}
          showClose={showClose}
        />
      }
    >
      {panel()}
    </Suspense>
  );
});
