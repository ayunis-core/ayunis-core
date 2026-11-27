import { Outlet } from '@tanstack/react-router';
import {
  OnboardingReturnButton,
  OnboardingTourProvider,
  useOpenPanelOnboardingStage,
} from '@/widgets/onboarding';
import { WelcomeVideoDialog } from '@/widgets/welcome-video-dialog';
import { ReleaseNoteAnnouncementDialog } from '@/widgets/release-note-announcement';

export default function AuthenticatedLayout() {
  return (
    <OnboardingTourProvider>
      <Outlet />
      <Onboarding />
    </OnboardingTourProvider>
  );
}

function Onboarding() {
  useOpenPanelOnboardingStage();
  return (
    <>
      <OnboardingReturnButton />
      <WelcomeVideoDialog />
      <ReleaseNoteAnnouncementDialog />
    </>
  );
}
