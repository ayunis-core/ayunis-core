import { createFileRoute } from '@tanstack/react-router';
import { WelcomePrototypePage } from '@/pages/welcome-prototype';

export const Route = createFileRoute('/(onboarding)/welcome-prototype')({
  component: WelcomePrototypePage,
});
