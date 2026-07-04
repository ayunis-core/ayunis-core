import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import TwoFactorPage from '@/pages/auth/two-factor';

const searchSchema = z.object({
  redirect: z.string().optional(),
  enroll: z.boolean().optional(),
});

export const Route = createFileRoute('/(onboarding)/two-factor')({
  component: RouteComponent,
  validateSearch: searchSchema,
});

function RouteComponent() {
  const { redirect, enroll } = Route.useSearch();
  return <TwoFactorPage redirect={redirect} enroll={enroll ?? false} />;
}
