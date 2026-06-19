import { createFileRoute, Navigate } from '@tanstack/react-router';
import { OnboardingPage } from '@/pages/onboarding';
import { useMe } from '@/widgets/app-sidebar/api/useMe';

export const Route = createFileRoute('/_authenticated/getting-started/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { user, isLoading } = useMe();

  if (isLoading) {
    return null;
  }
  if (user?.onboardingHidden) {
    return <Navigate to="/chat" />;
  }
  return <OnboardingPage />;
}
