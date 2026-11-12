import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import { useMyPermissions } from '@/features/permissions';
import {
  OwnerBadge,
  ownerOf,
  useResourceOwnership,
} from '@/features/resource-ownership';
import type {
  RecordingResponseDto,
  WorkspaceResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useConfirmation } from '@/widgets/confirmation-modal';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { ResourceOwnerCard } from '@/widgets/resource-owner-card';
import { RecordingPropertiesCard } from '@/widgets/resource-properties-card';
import { useDeleteRecording } from '@/pages/recordings/api/useDeleteRecording';
import {
  useChangeRecordingOwner,
  useRecording,
  useRenameRecording,
} from '@/pages/recording/api';
import { RecordingSummaryCard } from './RecordingSummaryCard';
import { RecordingTranscriptCard } from './RecordingTranscriptCard';

export function RecordingPage({
  recording: loaded,
  workspace,
}: Readonly<{
  recording: RecordingResponseDto;
  /** The owning workspace of a workspace recording. */
  workspace?: WorkspaceResponseDto;
}>) {
  const recording = useRecording(loaded);
  const { t } = useTranslation('recordings');
  const { t: tWorkspace } = useTranslation('workspace');
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const { can } = useMyPermissions();
  const { canManage, labelOf } = useResourceOwnership('recording');
  const { renameRecording } = useRenameRecording(recording.id);
  const { changeOwner } = useChangeRecordingOwner(recording.id);
  const deleteRecording = useDeleteRecording(() => {
    void (workspace
      ? navigate({
          to: '/workspaces/$workspaceId',
          params: { workspaceId: workspace.id },
          search: { tab: 'recordings' },
        })
      : navigate({ to: '/recordings' }));
  });

  // Reading a workspace recording already takes access to its workspace.
  const isManageable = workspace
    ? can('manage_recordings')
    : canManage(recording);
  const owner = ownerOf(recording);
  const ownerLabel = owner
    ? labelOf(owner)
    : t('detail.properties.workspaceOwner', { name: workspace?.name ?? '' });

  const breadcrumbs = workspace
    ? [
        { label: tWorkspace('page.breadcrumb'), href: '/workspaces' },
        { label: workspace.name, href: `/workspaces/${workspace.id}` },
        {
          label: tWorkspace('page.recordingsTab'),
          href: `/workspaces/${workspace.id}`,
          search: { tab: 'recordings' },
        },
        { label: recording.name },
      ]
    : [
        { label: t('page.title'), href: '/recordings' },
        { label: recording.name },
      ];

  const handleDelete = () =>
    confirm({
      title: t('confirmDelete.title'),
      description: t('confirmDelete.description', { name: recording.name }),
      confirmText: t('confirmDelete.confirmText'),
      cancelText: t('confirmDelete.cancelText'),
      variant: 'destructive',
      onConfirm: () => deleteRecording.mutate(recording.id),
    });

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={breadcrumbs}
            badge={
              <OwnerBadge
                resource={recording}
                testId="recording-detail-owner-badge"
              />
            }
            action={
              isManageable ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={handleDelete}
                      disabled={deleteRecording.isPending}
                      aria-label={t('detail.deleteLabel')}
                      data-testid="recording-detail-delete"
                    >
                      <Trash2 />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('detail.deleteLabel')}</TooltipContent>
                </Tooltip>
              ) : undefined
            }
          />
        }
        contentArea={
          <div className="grid gap-4" data-testid="recording-page">
            {isManageable && (
              <ResourceOwnerCard
                kind="recording"
                resource={recording}
                onChange={changeOwner}
              />
            )}
            <RecordingPropertiesCard
              key={`${recording.id}-${recording.updatedAt}`}
              recording={recording}
              ownerLabel={ownerLabel}
              onRename={renameRecording}
              disabled={!isManageable}
            />
            {recording.summary ? (
              <RecordingSummaryCard
                recording={recording}
                summary={recording.summary}
                canManage={isManageable}
              />
            ) : null}
            <RecordingTranscriptCard
              recording={recording}
              canManage={isManageable}
            />
          </div>
        }
      />
    </AppLayout>
  );
}
