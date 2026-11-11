import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { AudioLines, Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { ItemGroup } from '@ayunis/ui/components/item';
import { useMyPermissions } from '@/features/permissions';
import { RecordingListItem } from '@/shared/ui/recording-list-item';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { RecordingCreateDialog } from '@/widgets/resource-create-dialog';
import {
  useWorkspaceRecordingActions,
  useWorkspaceRecordings,
} from '@/pages/workspace/api/useWorkspaceRecordings';
import { WorkspaceContextEmpty } from './WorkspaceContextList';

export function WorkspaceRecordingsTab({
  workspaceId,
}: Readonly<{ workspaceId: string }>) {
  const { t } = useTranslation('workspace');
  const { t: tRecordings } = useTranslation('recordings');
  const navigate = useNavigate();
  const { confirm } = useConfirmation();
  const { can } = useMyPermissions();
  const canManage = can('manage_recordings');
  const { recordings, isLoading } = useWorkspaceRecordings(workspaceId, true);
  const { createRecording, deleteRecording, isDeleting } =
    useWorkspaceRecordingActions(workspaceId);

  const open = (recordingId: string) =>
    void navigate({ to: '/recordings/$id', params: { id: recordingId } });

  return (
    <section className="space-y-3">
      {canManage ? (
        <div className="flex justify-end">
          <RecordingCreateDialog
            buttonText={t('context.recordings.create')}
            buttonTestId="workspace-recording-create"
            onCreate={async ({ name }) => {
              const recording = await createRecording(name);
              open(recording.id);
            }}
          />
        </div>
      ) : null}
      {isLoading ? <p>{t('context.addDialog.loading')}</p> : null}
      {!isLoading && recordings.length === 0 ? (
        <WorkspaceContextEmpty
          icon={<AudioLines />}
          title={t('context.recordings.emptyTitle')}
          description={t('context.recordings.empty')}
        />
      ) : null}
      {recordings.length > 0 ? (
        <ItemGroup className="gap-2">
          {recordings.map((recording) => (
            <RecordingListItem
              key={recording.id}
              recording={recording}
              testId={`workspace-recording-${recording.id}`}
              onClick={() => open(recording.id)}
              actions={
                canManage ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    aria-label={tRecordings('confirmDelete.confirmText')}
                    disabled={isDeleting}
                    onClick={() =>
                      confirm({
                        title: tRecordings('confirmDelete.title'),
                        description: tRecordings('confirmDelete.description', {
                          name: recording.name,
                        }),
                        confirmText: tRecordings('confirmDelete.confirmText'),
                        cancelText: tRecordings('confirmDelete.cancelText'),
                        variant: 'destructive',
                        onConfirm: () => deleteRecording(recording.id),
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                ) : undefined
              }
            />
          ))}
        </ItemGroup>
      ) : null}
    </section>
  );
}
