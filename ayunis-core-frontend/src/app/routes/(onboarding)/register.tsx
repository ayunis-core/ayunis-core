import { createFileRoute } from '@tanstack/react-router';
import RegisterPage from '@/pages/auth/register';
import { appControllerIsCloud } from '@/shared/api';

export const Route = createFileRoute('/(onboarding)/register')({
  component: RouteComponent,
  loader: async () => {
    const { isCloud } = await appControllerIsCloud();
    return {
      isCloud,
    };
  },
});

function RouteComponent() {
  const { isCloud } = Route.useLoaderData();
  return <RegisterPage isCloud={isCloud} />;
}
