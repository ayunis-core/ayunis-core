import { createFileRoute, redirect } from '@tanstack/react-router';
import z from 'zod';
import LoginPage from '@/pages/auth/login';
import { meQueryOptions } from '@/shared/api/me-query-options';
import { SessionHandoffRequestDtoClient } from '@/shared/api/generated/ayunisCoreAPI.schemas';

const searchSchema = z.object({
  client: z.enum(SessionHandoffRequestDtoClient),
});

// Opened by the Outlook add-in in an Office dialog. The regular login runs
// unchanged; every success path (password, two-factor, SSO) continues to
// /outlook/handoff, which hands the session over to the add-in.
export const Route = createFileRoute('/(onboarding)/outlook/login')({
  validateSearch: searchSchema,
  beforeLoad: async ({ context: { queryClient }, search }) => {
    const user = await queryClient
      .query({ ...meQueryOptions(), staleTime: 0 })
      .catch(() => null);
    if (user) {
      throw redirect({ to: '/outlook/handoff', search });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { client } = Route.useSearch();
  return (
    <LoginPage
      redirect={`/outlook/handoff?client=${client}`}
      showRegisterLink={false}
    />
  );
}
