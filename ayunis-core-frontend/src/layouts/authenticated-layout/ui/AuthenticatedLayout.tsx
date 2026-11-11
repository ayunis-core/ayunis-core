import { Outlet } from '@tanstack/react-router';
import {
  OnboardingReturnButton,
  OnboardingTourProvider,
  useOpenPanelOnboardingStage,
} from '@/widgets/onboarding';
import { WelcomeVideoDialog } from '@/widgets/welcome-video-dialog';

export default function AuthenticatedLayout() {
  useOpenPanelOnboardingStage();
  return (
    <OnboardingTourProvider>
      <Outlet />
      <OnboardingReturnButton />
      <WelcomeVideoDialog />
    </OnboardingTourProvider>
  );
}
