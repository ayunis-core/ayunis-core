import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRouter } from '@tanstack/react-router';
import { Button } from '@ayunis/ui/components/button';
import { useResourceOwnership } from '@/features/resource-ownership';
import type { RecordingResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { RecordingListItem } from '@/shared/ui/recording-list-item';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { useDeleteRecording } from '@/pages/recordings/api/useDeleteRecording';

export default function RecordingCard({
  recording,
}: Readonly<{ recording: RecordingResponseDto }>) {
  const { t } = useTranslation('recordings');
  const router = useRouter();
  const { confirm } = useConfirmation();
  const { canManage } = useResourceOwnership('recording');
  const deleteRecording = useDeleteRecording();

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
    <RecordingListItem
      recording={recording}
      testId={`recording-card-${recording.id}`}
      onClick={() =>
        void router.navigate({
          to: '/recordings/$id',
          params: { id: recording.id },
        })
      }
      actions={
        canManage(recording) ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            aria-label={t('confirmDelete.confirmText')}
            onClick={handleDelete}
            disabled={deleteRecording.isPending}
            data-testid={`recording-card-delete-${recording.id}`}
          >
            <Trash2 />
          </Button>
        ) : undefined
      }
    />
  );
}
