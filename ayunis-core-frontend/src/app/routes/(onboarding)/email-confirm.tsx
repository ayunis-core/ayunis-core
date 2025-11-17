import { EmailConfirmPage } from '@/pages/auth/email-confirm';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(onboarding)/email-confirm')({
  component: RouteComponent,
});

function RouteComponent() {
  return <EmailConfirmPage />;
}
