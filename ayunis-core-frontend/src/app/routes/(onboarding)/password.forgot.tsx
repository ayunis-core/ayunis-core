import { createFileRoute } from '@tanstack/react-router';
import ForgotPasswordPage from '@/pages/auth/forgot-password';

export const Route = createFileRoute('/(onboarding)/password/forgot')({
  component: RouteComponent,
});

function RouteComponent() {
  return <ForgotPasswordPage />;
}
