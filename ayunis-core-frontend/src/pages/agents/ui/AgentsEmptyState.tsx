import CreateAgentDialog from './CreateAgentDialog';
import { useTranslation } from 'react-i18next';

export default function AgentsEmptyState() {
  const { t } = useTranslation('agents');

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md">
      <h3 className="text-lg font-semibold mb-2">{t('emptyState.title')}</h3>
      <p className="mb-6 text-muted-foreground">
        {t('emptyState.description')}
      </p>
      <CreateAgentDialog
        buttonText={t('createDialog.buttonTextFirst')}
        showIcon={true}
      />
    </div>
  );
}
