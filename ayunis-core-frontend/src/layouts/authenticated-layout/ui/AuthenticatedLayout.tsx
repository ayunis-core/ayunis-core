import { Outlet } from '@tanstack/react-router';
import {
  OnboardingReturnButton,
  OnboardingTourProvider,
} from '@/widgets/onboarding';
import { WelcomeVideoDialog } from '@/widgets/welcome-video-dialog';
import { JourneyCard, JourneyProvider } from '@/widgets/prototype-journey';

export default function AuthenticatedLayout() {
  return (
    <JourneyProvider>
      <OnboardingTourProvider>
        <Outlet />
        <OnboardingReturnButton />
        <WelcomeVideoDialog />
        <JourneyCard />
      </OnboardingTourProvider>
    </JourneyProvider>
  );
}
