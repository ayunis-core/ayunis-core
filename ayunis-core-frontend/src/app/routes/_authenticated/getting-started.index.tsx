import { createFileRoute, Navigate } from '@tanstack/react-router';
import { OnboardingPage } from '@/pages/onboarding';
import { isGettingStartedHidden } from '@/features/onboarding-progress';

export const Route = createFileRoute('/_authenticated/getting-started/')({
  component: RouteComponent,
});

function RouteComponent() {
  if (isGettingStartedHidden()) {
    return <Navigate to="/chat" />;
  }
  return <OnboardingPage />;
}
