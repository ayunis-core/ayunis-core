import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { IntegrationOAuthCallbackPage } from '@/pages/settings/integration-oauth-callback';

const searchSchema = z.object({
  state: z.string(),
  code: z.string().optional(),
  iss: z.string().optional(),
  error: z.string().optional(),
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
