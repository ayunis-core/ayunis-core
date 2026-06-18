import { createFileRoute } from '@tanstack/react-router';
import { OnboardingSettingsPage } from '@/pages/onboarding';

export const Route = createFileRoute(
  '/_authenticated/settings/getting-started',
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <OnboardingSettingsPage />;
}
