import { createFileRoute, redirect } from '@tanstack/react-router';
import { OnboardingPage } from '@/pages/onboarding';

export const Route = createFileRoute('/_authenticated/getting-started/')({
  beforeLoad: ({ context: { user } }) => {
    if (user.onboardingHidden) {
      throw redirect({ to: '/chat' });
    }
  },
  component: OnboardingPage,
});
