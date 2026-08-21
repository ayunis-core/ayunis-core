import { createFileRoute, redirect } from '@tanstack/react-router';
import SsoStartPage from '@/pages/auth/sso-start';
import { getAppControllerFeatureTogglesQueryOptions } from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute('/(onboarding)/sso/$identifier')({
  beforeLoad: async ({ context: { queryClient } }) => {
    const toggles = await queryClient
      .fetchQuery(getAppControllerFeatureTogglesQueryOptions())
      .catch(() => null);
    if (!toggles?.ssoLoginEnabled) {
      throw redirect({ to: '/login' });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { identifier } = Route.useParams();
  return <SsoStartPage identifier={identifier} />;
}
