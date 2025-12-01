import { createFileRoute } from '@tanstack/react-router';
import RegisterPage from '@/pages/auth/register';
import { appControllerIsCloud } from '@/shared/api';

export const Route = createFileRoute('/(onboarding)/register')({
  component: RouteComponent,
  loader: async () => {
    const { isCloud, isRegistrationDisabled } = await appControllerIsCloud();
    return {
      isCloud,
      isRegistrationDisabled,
    };
  },
});

function RouteComponent() {
  const { isCloud, isRegistrationDisabled } = Route.useLoaderData();
  return (
    <RegisterPage
      isCloud={isCloud}
      isRegistrationDisabled={isRegistrationDisabled}
    />
  );
}
