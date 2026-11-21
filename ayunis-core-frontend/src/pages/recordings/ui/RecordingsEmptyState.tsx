import { useTranslation } from 'react-i18next';
import { AudioLines, FilePlus, FileText, Upload } from 'lucide-react';
import { useMyPermissions } from '@/features/permissions';
import { EmptyState } from '@/widgets/empty-state';
import { ChatStarter, type ChatStarterDefaults } from '@/widgets/chat-starter';
import CreateRecordingDialog from './CreateRecordingDialog';

interface RecordingsEmptyStateProps {
  chatStarter: ChatStarterDefaults;
}

export default function RecordingsEmptyState({
  chatStarter,
}: Readonly<RecordingsEmptyStateProps>) {
  const { t } = useTranslation('recordings');
  const { can, isLoading } = useMyPermissions();
  const canCreate = isLoading || can('manage_recordings');

  return (
    <EmptyState
      testId="recordings-empty-state"
      icon={AudioLines}
      title={t('emptyState.title')}
      description={
        canCreate
          ? t('emptyState.description')
          : t('emptyState.noAccessDescription')
      }
      steps={[
        {
          icon: FilePlus,
          title: t('emptyState.steps.create.title'),
          description: t('emptyState.steps.create.description'),
        },
        {
          icon: Upload,
          title: t('emptyState.steps.upload.title'),
          description: t('emptyState.steps.upload.description'),
        },
        {
          icon: FileText,
          title: t('emptyState.steps.use.title'),
          description: t('emptyState.steps.use.description'),
        },
      ]}
      action={
        canCreate ? (
          <CreateRecordingDialog
            buttonText={t('createDialog.buttonTextFirst')}
            showIcon
          />
        ) : undefined
      }
      guide={
        <ChatStarter
          {...chatStarter}
          origin={{ kind: 'feature_guide', feature: 'recordings' }}
          placeholder={t('emptyState.askPlaceholder')}
        />
      }
    />
  );
}
