import { Outlet } from '@tanstack/react-router';
import {
  OnboardingReturnButton,
  OnboardingTourProvider,
} from '@/widgets/onboarding';
import { WelcomeVideoDialog } from '@/widgets/welcome-video-dialog';
import { JourneyCard } from '@/widgets/prototype-journey';

export default function AuthenticatedLayout() {
  return (
    <OnboardingTourProvider>
      <Outlet />
      <OnboardingReturnButton />
      <WelcomeVideoDialog />
      <JourneyCard />
    </OnboardingTourProvider>
  );
}
