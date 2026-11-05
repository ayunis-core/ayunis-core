import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { IntegrationOAuthCallbackPage } from '@/pages/settings/integration-oauth-callback';
import { searchParamString } from '@/shared/lib/search-params';

const searchSchema = z.object({
  state: searchParamString,
  code: searchParamString.optional(),
  iss: searchParamString.optional(),
  error: searchParamString.optional(),
});

export const Route = createFileRoute(
  '/_authenticated/settings/integrations_/oauth/callback',
)({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  return <IntegrationOAuthCallbackPage {...Route.useSearch()} />;
}
