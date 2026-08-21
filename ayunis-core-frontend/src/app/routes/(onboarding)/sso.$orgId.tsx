import { createFileRoute } from '@tanstack/react-router';
import SsoStartPage from '@/pages/auth/sso-start';

export const Route = createFileRoute('/(onboarding)/sso/$orgId')({
  component: RouteComponent,
});

function RouteComponent() {
  const { orgId } = Route.useParams();
  return <SsoStartPage orgId={orgId} />;
}
