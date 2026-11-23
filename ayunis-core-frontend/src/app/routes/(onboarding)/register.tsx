import { createFileRoute, redirect } from '@tanstack/react-router';
import RegisterPage from '@/pages/auth/register';
import { appControllerIsCloud } from '@ayunis/api-client';

export const Route = createFileRoute('/(onboarding)/register')({
  component: RouteComponent,
  beforeLoad: async () => {
    const { isCloud, isRegistrationDisabled } = await appControllerIsCloud();
    if (isCloud && isRegistrationDisabled) {
      throw redirect({ to: '/login' });
    }
    return { isCloud };
  },
});

function RouteComponent() {
  const { isCloud } = Route.useRouteContext();
  return <RegisterPage isCloud={isCloud} />;
}
