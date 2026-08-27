import { createFileRoute } from '@tanstack/react-router';
import SsoStartPage from '@/pages/auth/sso-start';

export const Route = createFileRoute('/(onboarding)/sso/$identifier')({
  component: RouteComponent,
});

function RouteComponent() {
  const { identifier } = Route.useParams();
  return <SsoStartPage identifier={identifier} />;
}
