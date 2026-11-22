import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { McpIntegrationsPage } from '@/pages/admin-settings/integrations-settings/ui/mcp-integrations-page';
import { appControllerIsCloud } from '@/shared/api';
import { searchParamString } from '@/shared/lib/search-params';

const searchSchema = z.object({
  page: z.number().min(1).optional().catch(1),
  // Set after a save or install; the list swaps it for that integration's page.
  integration: searchParamString.optional(),
});

export const Route = createFileRoute(
  '/_authenticated/admin-settings/integrations/',
)({
  validateSearch: searchSchema,
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
  const { page = 1, integration } = Route.useSearch();
  return (
    <McpIntegrationsPage
      isCloud={isCloud}
      page={page}
      integrationId={integration}
    />
  );
}
