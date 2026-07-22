import { Outlet } from '@tanstack/react-router';
import {
  OnboardingReturnButton,
  OnboardingTourProvider,
} from '@/widgets/onboarding';
import { WelcomeVideoDialog } from '@/widgets/welcome-video-dialog';

export default function AuthenticatedLayout() {
  return (
    <OnboardingTourProvider>
      <Outlet />
      <OnboardingReturnButton />
      <WelcomeVideoDialog />
    </OnboardingTourProvider>
  );
}
