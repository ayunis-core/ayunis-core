import { createFileRoute, redirect } from '@tanstack/react-router';
import LoginPage from '@/pages/auth/login';
import { meQueryOptions } from '@/shared/api/me-query-options';
import { safeRedirectPath } from '@/shared/lib/safe-redirect-path';
import z from 'zod';

export const Route = createFileRoute('/(onboarding)/login')({
  validateSearch: z.object({
    emailVerified: z.boolean().optional(),
    redirect: z.string().optional(),
  }),
  beforeLoad: async ({ context: { queryClient }, search }) => {
    // staleTime 0 overrides the app-wide 5-minute default: a cached "signed
    // in" is not good enough here. If the cookie died meanwhile (expiry,
    // revocation, logout in another tab) a warm cache would bounce the user
    // into an app whose every request 401s, with no way back to this form.
    const user = await queryClient
      .fetchQuery({ ...meQueryOptions(), staleTime: 0 })
      .catch(() => null);
    if (user) {
      throw redirect({ to: safeRedirectPath(search.redirect) });
    }
  },
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
