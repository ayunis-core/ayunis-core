import { createFileRoute } from '@tanstack/react-router';
import SsoSuccessPage from '@/pages/auth/sso-success';

export const Route = createFileRoute('/(onboarding)/sso/success')({
  component: SsoSuccessPage,
});
