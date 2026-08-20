import { lazy, Suspense } from 'react';
import { isAxiosError } from 'axios';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';
import type { ArtifactResponseDto } from '@/shared/api';
import type { ArtifactsControllerExportFormat } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import ArtifactSidePanelSkeleton from './ArtifactSidePanelSkeleton';

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
  readonly onClose: () => void;
  readonly onLetterheadChange: (letterheadId: string | null) => void;
  readonly isExporting?: boolean;
}

export function ArtifactSidePanel({
  artifact,
  isLoading = false,
  error,
  onRetry,
  onSave,
  onRevert,
  onExport,
  onClose,
  onLetterheadChange,
  isExporting,
}: ArtifactSidePanelProps) {
  const { t } = useTranslation('chat');
  const hasArtifactNotFoundError =
    isAxiosError(error) && error.response?.status === 404;
  const hasArtifactLoadError = Boolean(error) && !hasArtifactNotFoundError;

  if (!artifact) {
    if (isLoading) {
      return <ArtifactSidePanelSkeleton onClose={onClose} />;
    }

    return (
      <aside
        className="flex h-full min-h-0 flex-col overflow-hidden border-l bg-background"
        data-testid="artifact-side-panel-error"
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h2 className="truncate text-sm font-semibold">
            {t('chat.artifactPanel.title')}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            data-testid="artifact-side-panel-close"
            onClick={onClose}
            aria-label={t('chat.artifactPanel.close')}
          >
            <X className="size-4" />
          </Button>
        </div>
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
                  ? 'chat.artifactPanel.loadErrorTitle'
                  : 'chat.artifactPanel.notFoundTitle',
              )}
            </AlertTitle>
            <AlertDescription>
              {t(
                hasArtifactLoadError
                  ? 'chat.artifactPanel.loadErrorDescription'
                  : 'chat.artifactPanel.notFoundDescription',
              )}
              {hasArtifactLoadError && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  data-testid="artifact-side-panel-retry"
                  onClick={onRetry}
                >
                  {t('chat.artifactPanel.retry')}
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
          />
        );
      case 'spreadsheet':
        return (
          <LazySpreadsheetEditor
            key={artifact.id}
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
            key={artifact.id}
            artifact={artifact}
            onSave={(content) => {
              void onSave(content);
            }}
            onRevert={onRevert}
            onExport={onExport}
            onClose={onClose}
            onLetterheadChange={onLetterheadChange}
            isExporting={isExporting}
          />
        );
    }
  };

  return (
    <Suspense
      fallback={
        <ArtifactSidePanelSkeleton
          variant={artifact.type === 'spreadsheet' ? 'spreadsheet' : 'document'}
          onClose={onClose}
        />
      }
    >
      {panel()}
    </Suspense>
  );
}
