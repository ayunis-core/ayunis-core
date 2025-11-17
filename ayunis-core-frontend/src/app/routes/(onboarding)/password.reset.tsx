import { createFileRoute } from '@tanstack/react-router';
import ResetPasswordPage from '@/pages/auth/reset-password';
import { z } from 'zod';

const searchSchema = z.object({
  token: z.string(),
});

export const Route = createFileRoute('/(onboarding)/password/reset')({
  component: RouteComponent,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps: { token } }) => {
    return {
      token,
    };
  },
});

function RouteComponent() {
  const { token } = Route.useLoaderData();
  return <ResetPasswordPage token={token} />;
}
