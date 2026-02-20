import AppLayout from '@/layouts/app-layout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { useTranslation } from 'react-i18next';
import { useMarketplaceControllerGetSkill } from '../api/useFetchMarketplaceSkill';
import { useInstallFromMarketplace } from '../api/useInstallFromMarketplace';
import { InstallErrorState } from './InstallErrorState';
import { InstallLoadingSkeleton } from './InstallLoadingSkeleton';
import { InstallSkillCard } from './InstallSkillCard';

interface InstallPageProps {
  skillIdentifier: string | undefined;
}

export default function InstallPage({
  skillIdentifier,
}: Readonly<InstallPageProps>) {
  const { t } = useTranslation('install');

  if (!skillIdentifier) {
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
        <InstallPageContent skillIdentifier={skillIdentifier} />
      </FullScreenMessageLayout>
    </AppLayout>
  );
}

function InstallPageContent({
  skillIdentifier,
}: Readonly<{ skillIdentifier: string }>) {
  const { t } = useTranslation('install');
  const {
    data: skill,
    isLoading,
    isError,
  } = useMarketplaceControllerGetSkill(skillIdentifier);
  const installMutation = useInstallFromMarketplace();

  if (isLoading) {
    return <InstallLoadingSkeleton />;
  }

  if (isError || !skill) {
    return (
      <InstallErrorState
        title={t('error.fetchFailed.title')}
        description={t('error.fetchFailed.description')}
      />
    );
  }

  return (
    <InstallSkillCard
      skill={skill}
      onInstall={() =>
        installMutation.mutate({ data: { identifier: skillIdentifier } })
      }
      isInstalling={installMutation.isPending}
    />
  );
}
