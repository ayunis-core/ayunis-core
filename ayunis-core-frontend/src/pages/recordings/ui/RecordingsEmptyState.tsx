import { useTranslation } from 'react-i18next';
import { useMyPermissions } from '@/features/permissions';
import { EmptyState } from '@/widgets/empty-state';
import CreateRecordingDialog from './CreateRecordingDialog';

export default function RecordingsEmptyState() {
  const { t } = useTranslation('recordings');
  const { can, isLoading } = useMyPermissions();
  const canCreate = isLoading || can('manage_recordings');

  return (
    <EmptyState
      title={t('emptyState.title')}
      description={
        canCreate
          ? t('emptyState.description')
          : t('emptyState.noAccessDescription')
      }
      action={
        canCreate ? (
          <CreateRecordingDialog
            buttonText={t('createDialog.buttonTextFirst')}
            showIcon
          />
        ) : undefined
      }
    />
  );
}
