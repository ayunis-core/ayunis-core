import CreateAgentDialog from './CreateAgentDialog';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/widgets/empty-state';

export default function AgentsEmptyState() {
  const { t } = useTranslation('agents');

  return (
    <EmptyState
      title={t('emptyState.title')}
      description={t('emptyState.description')}
      action={
        <CreateAgentDialog
          buttonText={t('createDialog.buttonTextFirst')}
          showIcon={true}
        />
      }
    />
  );
}
