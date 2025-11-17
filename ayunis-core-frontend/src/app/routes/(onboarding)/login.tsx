import { createFileRoute } from '@tanstack/react-router';
import LoginPage from '@/pages/auth/login';
import z from 'zod';

export const Route = createFileRoute('/(onboarding)/login')({
  validateSearch: z.object({
    emailVerified: z.boolean().optional(),
    redirect: z.string().optional(),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps: { emailVerified, redirect } }) => {
    return { emailVerified, redirect };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { emailVerified, redirect } = Route.useSearch();
  return <LoginPage redirect={redirect} emailVerified={emailVerified} />;
}
