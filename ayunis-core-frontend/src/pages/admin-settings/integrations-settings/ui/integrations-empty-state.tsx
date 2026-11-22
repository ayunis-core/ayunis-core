import { useTranslation } from 'react-i18next';
import { KeyRound, MessageSquare, Plug, Store } from 'lucide-react';
import { EmptyState } from '@/widgets/empty-state';
import { useMarketplaceConfig } from '@/features/marketplace';
import { marketplaceIntegrationsUrl } from '@/pages/admin-settings/integrations-settings/lib/marketplace-integrations-url';
import { AddIntegrationMenu } from './add-integration-menu';

export function IntegrationsEmptyState() {
  const { t } = useTranslation('admin-settings-integrations');
  const marketplaceUrl = marketplaceIntegrationsUrl(useMarketplaceConfig());

  return (
    <EmptyState
      testId="integrations-empty-state"
      icon={Plug}
      title={t('integrations.emptyState.title')}
      description={t('integrations.emptyState.description')}
      steps={[
        {
          icon: Store,
          title: t('integrations.emptyState.steps.install.title'),
          description: marketplaceUrl
            ? t('integrations.emptyState.steps.install.marketplaceDescription')
            : t('integrations.emptyState.steps.install.description'),
        },
        {
          icon: KeyRound,
          title: t('integrations.emptyState.steps.connect.title'),
          description: t('integrations.emptyState.steps.connect.description'),
        },
        {
          icon: MessageSquare,
          title: t('integrations.emptyState.steps.use.title'),
          description: t('integrations.emptyState.steps.use.description'),
        },
      ]}
      helpPath="settings/admin/integrations/"
      action={
        <AddIntegrationMenu
          showIcon
          buttonText={t('integrations.emptyState.addFirst')}
        />
      }
    />
  );
}
