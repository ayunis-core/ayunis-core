import { Outlet } from '@tanstack/react-router';
import {
  OnboardingReturnButton,
  OnboardingTourProvider,
  useOpenPanelOnboardingStage,
} from '@/widgets/onboarding';
import { WelcomeVideoDialog } from '@/widgets/welcome-video-dialog';
import { useEmbedded } from '@/shared/contexts/embedded/embeddedContext';

export default function AuthenticatedLayout() {
  const isEmbedded = useEmbedded();
  return (
    <OnboardingTourProvider>
      <Outlet />
      {!isEmbedded && <Onboarding />}
    </OnboardingTourProvider>
  );
}

function Onboarding() {
  useOpenPanelOnboardingStage();
  return (
    <>
      <OnboardingReturnButton />
      <WelcomeVideoDialog />
    </>
  );
}
