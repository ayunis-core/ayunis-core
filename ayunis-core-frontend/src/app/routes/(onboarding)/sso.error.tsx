import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import SsoErrorPage from '@/pages/auth/sso-error';
import { searchParamString } from '@/shared/lib/search-params';

export const Route = createFileRoute('/(onboarding)/sso/error')({
  validateSearch: z.object({ code: searchParamString.optional() }),
  component: RouteComponent,
});

function RouteComponent() {
  const { code } = Route.useSearch();
  return <SsoErrorPage code={code} />;
}
