import CreatePromptDialog from './CreatePromptDialog';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/widgets/empty-state';

export default function PromptsEmptyState() {
  const { t } = useTranslation('prompts');

  return (
    <EmptyState
      title={t('emptyState.title')}
      description={t('emptyState.description')}
      action={
        <CreatePromptDialog
          buttonText={t('createDialog.buttonTextFirst')}
          showIcon={true}
        />
      }
    />
  );
}
