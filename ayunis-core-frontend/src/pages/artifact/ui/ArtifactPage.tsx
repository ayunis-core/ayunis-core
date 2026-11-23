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
import { ChatStarter, type ChatStarterDefaults } from '@/widgets/chat-starter';
import { useDeleteArtifact } from '@/pages/artifact/api/useDeleteArtifact';
import { canDeleteArtifact } from '@/pages/artifact/lib/can-delete-artifact';
import { DeleteArtifactButton } from './DeleteArtifactButton';

interface ArtifactPageProps {
  readonly artifactId: string;
  readonly chatStarter: ChatStarterDefaults;
}

export default function ArtifactPage({
  artifactId,
  chatStarter,
}: ArtifactPageProps) {
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
  // Set when the page is left for a deleted artifact or a started chat, whose
  // unsaved edits were already dealt with.
  const leavingRef = useRef(false);
  useBlocker({
    shouldBlockFn: () =>
      new Promise<boolean>((resolve) => {
        if (!panelRef.current || leavingRef.current) {
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

  // The chat opens on another page, so unsaved edits are settled first, not
  // after the chat and its run already exist.
  const settleUnsavedEdits = () =>
    new Promise<boolean>((resolve) => {
      if (!panelRef.current) {
        resolve(true);
        return;
      }
      panelRef.current.requestExit(
        () => resolve(true),
        () => resolve(false),
      );
    });

  const deleteAction = useArtifactDeleteAction(artifactPanel.artifact, () => {
    leavingRef.current = true;
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
          <div className="flex flex-col gap-6">
            {/* The editors draw a left border to sit next to the chat; here
                the frame borders them on every side instead. */}
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
            {artifactPanel.artifact && (
              <div data-testid="artifact-chat-starter">
                <ChatStarter
                  workspaceId={artifactPanel.artifact.workspaceId}
                  artifact={artifactPanel.artifact}
                  placeholder={t('page.chatPlaceholder')}
                  autoFocus={false}
                  confirmStart={settleUnsavedEdits}
                  onStarted={() => {
                    leavingRef.current = true;
                  }}
                  selectedModelId={chatStarter.selectedModelId}
                  isEmbeddingModelEnabled={chatStarter.isEmbeddingModelEnabled}
                />
              </div>
            )}
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
