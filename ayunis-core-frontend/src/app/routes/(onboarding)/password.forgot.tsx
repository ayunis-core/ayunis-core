import { createFileRoute } from '@tanstack/react-router';
import z from 'zod';
import ForgotPasswordPage from '@/pages/auth/forgot-password';
import { searchParamString } from '@/shared/lib/search-params';

export const Route = createFileRoute('/(onboarding)/password/forgot')({
  validateSearch: z.object({
    redirect: searchParamString.optional(),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { redirect } = Route.useSearch();
  return <ForgotPasswordPage redirect={redirect} />;
}
