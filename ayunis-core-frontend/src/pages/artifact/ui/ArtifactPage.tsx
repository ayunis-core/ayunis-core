import { useRef } from 'react';
import { useBlocker } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { ArtifactPanel, useArtifactActions } from '@/widgets/artifact-panel';

interface ArtifactPageProps {
  readonly artifactId: string;
}

export default function ArtifactPage({ artifactId }: ArtifactPageProps) {
  const { t } = useTranslation('artifacts');
  const {
    artifactPanel,
    isExporting,
    handleSaveArtifact,
    handleRevertArtifact,
    handleExportArtifact,
    handleLetterheadChange,
  } = useArtifactActions(artifactId);
  const panelRef = useRef<ArtifactPanelHandle>(null);
  useBlocker({
    shouldBlockFn: () =>
      new Promise<boolean>((resolve) => {
        if (!panelRef.current) {
          resolve(false);
          return;
        }
        panelRef.current.requestExit(
          () => resolve(false),
          () => resolve(true),
        );
      }),
    // The browser's leave prompt needs a synchronous answer, but the editors
    // only report unsaved edits through their prompt.
    enableBeforeUnload: false,
  });

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: artifactPanel.artifact?.title ?? t('panel.title') },
            ]}
          />
        }
        contentArea={
          // The editors draw a left border to sit next to the chat; here the
          // frame borders them on every side instead.
          <div
            className="flex h-[75dvh] min-h-96 flex-col overflow-hidden rounded-lg border *:border-l-0"
            data-testid="artifact-page"
          >
            <ArtifactPanel
              ref={panelRef}
              {...artifactPanel}
              onSave={handleSaveArtifact}
              onRevert={handleRevertArtifact}
              onExport={handleExportArtifact}
              onLetterheadChange={handleLetterheadChange}
              isExporting={isExporting}
            />
          </div>
        }
      />
    </AppLayout>
  );
}
