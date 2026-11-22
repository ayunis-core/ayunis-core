import { useRef } from 'react';
import { useBlocker, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import type { ArtifactPanelHandle } from '@/shared/model/artifact-panel';
import { ArtifactPanel, useArtifactActions } from '@/widgets/artifact-panel';
import { resolveArtifactTitle } from '@/widgets/artifact-panel-header';
import { useMe } from '@/widgets/app-sidebar/api/useMe';
import { useWorkspace } from '@/features/workspaces';
import type { ArtifactResponseDto } from '@/shared/api';
import { useDeleteArtifact } from '@/pages/artifact/api/useDeleteArtifact';
import { canDeleteArtifact } from '@/pages/artifact/lib/can-delete-artifact';
import { DeleteArtifactButton } from './DeleteArtifactButton';

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
  const deletedRef = useRef(false);
  useBlocker({
    shouldBlockFn: () =>
      new Promise<boolean>((resolve) => {
        if (!panelRef.current || deletedRef.current) {
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

  const deleteAction = useArtifactDeleteAction(artifactPanel.artifact, () => {
    deletedRef.current = true;
  });

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              {
                label: artifactPanel.artifact
                  ? resolveArtifactTitle(artifactPanel.artifact)
                  : t('panel.title'),
              },
            ]}
            action={deleteAction}
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

/**
 * The delete button, for those allowed to delete the artifact. After deleting
 * it leaves for the list of the artifact's owner; `onDeleted` runs first so
 * that unsaved edits do not hold the page.
 */
function useArtifactDeleteAction(
  artifact: ArtifactResponseDto | null,
  onDeleted: () => void,
) {
  const navigate = useNavigate();
  const { user } = useMe();
  const { workspace } = useWorkspace(artifact?.workspaceId ?? null);
  const { mutate, isPending } = useDeleteArtifact(async () => {
    onDeleted();
    if (artifact?.workspaceId) {
      await navigate({
        to: '/workspaces/$workspaceId',
        params: { workspaceId: artifact.workspaceId },
        search: { tab: 'artifacts' },
      });
    } else {
      await navigate({ to: '/library' });
    }
  });

  if (!artifact || !canDeleteArtifact(artifact, user?.id, workspace)) {
    return undefined;
  }
  return (
    <DeleteArtifactButton
      title={resolveArtifactTitle(artifact)}
      isDeleting={isPending}
      onDelete={() => mutate(artifact.id)}
    />
  );
}
