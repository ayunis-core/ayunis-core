import CreateKnowledgeBaseDialog from './CreateKnowledgeBaseDialog';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/widgets/empty-state';

export default function KnowledgeBasesEmptyState() {
  const { t } = useTranslation('knowledge-bases');

  return (
    <EmptyState
      title={t('emptyState.title')}
      description={t('emptyState.description')}
      action={
        <CreateKnowledgeBaseDialog
          buttonText={t('createDialog.buttonTextFirst')}
          showIcon={true}
        />
      }
    />
  );
}
