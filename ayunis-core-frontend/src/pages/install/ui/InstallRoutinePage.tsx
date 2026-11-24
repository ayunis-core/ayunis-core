import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import {
  useIsFeatureEnabled,
  useFeatureToggles,
} from '@/features/feature-toggles';
import { useMyPermissions } from '@/features/permissions';
import extractErrorData from '@/shared/api/extract-error-data';
import { useMarketplaceControllerGetRoutine } from '@/pages/install/api/useFetchMarketplaceRoutine';
import { useInstallRoutineFromMarketplace } from '@/pages/install/api/useInstallRoutineFromMarketplace';
import { InstallErrorState } from './InstallErrorState';
import { InstallLoadingSkeleton } from './InstallLoadingSkeleton';
import { InstallRoutineCard } from './InstallRoutineCard';

interface InstallRoutinePageProps {
  routineIdentifier: string;
}

export default function InstallRoutinePage({
  routineIdentifier,
}: Readonly<InstallRoutinePageProps>) {
  return (
    <AppLayout>
      <FullScreenMessageLayout>
        <InstallRoutineContent routineIdentifier={routineIdentifier} />
      </FullScreenMessageLayout>
    </AppLayout>
  );
}

function InstallRoutineContent({
  routineIdentifier,
}: Readonly<{ routineIdentifier: string }>) {
  const { t } = useTranslation('install-routine');
  const { isLoading: isLoadingToggles } = useFeatureToggles();
  const routinesEnabled = useIsFeatureEnabled('routinesEnabled');
  const { can, isLoading: isLoadingPermissions } = useMyPermissions();
  const mayInstall =
    can('manage_routines') && can('install_marketplace_routines');
  const preview = useMarketplaceControllerGetRoutine(routineIdentifier, {
    query: { enabled: routinesEnabled && mayInstall },
  });
  const installMutation = useInstallRoutineFromMarketplace();

  if (isLoadingToggles || isLoadingPermissions) {
    return <InstallLoadingSkeleton />;
  }

  if (!routinesEnabled) {
    return (
      <InstallErrorState
        title={t('error.disabled.title')}
        description={t('error.disabled.description')}
        backTo="/"
        backLabel={t('action.backToChat')}
        testId="install-routine-disabled"
      />
    );
  }

  if (!mayInstall) {
    return (
      <InstallErrorState
        title={t('error.noPermission.title')}
        description={t('error.noPermission.description')}
        backTo="/"
        backLabel={t('action.backToChat')}
        testId="install-routine-no-permission"
      />
    );
  }

  if (preview.isPending) {
    return <InstallLoadingSkeleton />;
  }

  if (!preview.data) {
    const notFound = previewStatus(preview.error) === 404;
    const error = notFound ? 'notFound' : 'unavailable';
    return (
      <InstallErrorState
        title={t(`error.${error}.title`)}
        description={t(`error.${error}.description`)}
        backTo="/routines"
        backLabel={t('action.backToRoutines')}
        testId={`install-routine-${notFound ? 'not-found' : 'unavailable'}`}
      />
    );
  }

  return (
    <InstallRoutineCard
      routine={preview.data}
      onInstall={() =>
        installMutation.mutate({ data: { identifier: routineIdentifier } })
      }
      isInstalling={installMutation.isPending}
    />
  );
}

function previewStatus(error: unknown): number | undefined {
  try {
    return extractErrorData(error).status;
  } catch {
    return undefined;
  }
}
