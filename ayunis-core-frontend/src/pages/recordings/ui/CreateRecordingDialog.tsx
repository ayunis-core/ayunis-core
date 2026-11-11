import { useMyPermissions } from '@/features/permissions';
import { useResourceOwnership } from '@/features/resource-ownership';
import { RecordingCreateDialog } from '@/widgets/resource-create-dialog';
import { useCreateRecording } from '@/pages/recordings/api/useCreateRecording';

export default function CreateRecordingDialog({
  buttonText,
  showIcon = false,
}: Readonly<{ buttonText?: string; showIcon?: boolean }>) {
  const { createRecording } = useCreateRecording();
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  const { options, isLoading: isOwnerChoiceLoading } =
    useResourceOwnership('recording');

  if (!isLoadingPermissions && !can('manage_recordings')) return null;

  return (
    <RecordingCreateDialog
      buttonText={buttonText}
      showIcon={showIcon}
      onCreate={createRecording}
      buttonTestId="recording-create"
      ownerOptions={options}
      isOwnerChoiceLoading={isOwnerChoiceLoading}
    />
  );
}
