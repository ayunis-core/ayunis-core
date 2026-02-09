import AppLayout from '@/layouts/app-layout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { useTranslation } from 'react-i18next';
import { useMarketplaceControllerGetAgent } from '../api/useFetchMarketplaceAgent';
import { useInstallFromMarketplace } from '../api/useInstallFromMarketplace';
import { InstallErrorState } from './InstallErrorState';
import { InstallLoadingSkeleton } from './InstallLoadingSkeleton';
import { InstallAgentCard } from './InstallAgentCard';

interface InstallPageProps {
  agentIdentifier: string | undefined;
}

export default function InstallPage({ agentIdentifier }: InstallPageProps) {
  const { t } = useTranslation('install');

  if (!agentIdentifier) {
    return (
      <AppLayout>
        <FullScreenMessageLayout>
          <InstallErrorState
            title={t('error.missingIdentifier.title')}
            description={t('error.missingIdentifier.description')}
          />
        </FullScreenMessageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <FullScreenMessageLayout>
        <InstallPageContent agentIdentifier={agentIdentifier} />
      </FullScreenMessageLayout>
    </AppLayout>
  );
}

function InstallPageContent({ agentIdentifier }: { agentIdentifier: string }) {
  const { t } = useTranslation('install');
  const {
    data: agent,
    isLoading,
    isError,
  } = useMarketplaceControllerGetAgent(agentIdentifier);
  const installMutation = useInstallFromMarketplace();

  if (isLoading) {
    return <InstallLoadingSkeleton />;
  }

  if (isError || !agent) {
    return (
      <InstallErrorState
        title={t('error.fetchFailed.title')}
        description={t('error.fetchFailed.description')}
      />
    );
  }

  return (
    <InstallAgentCard
      agent={agent}
      onInstall={() =>
        installMutation.mutate({ data: { identifier: agentIdentifier } })
      }
      isInstalling={installMutation.isPending}
    />
  );
}
