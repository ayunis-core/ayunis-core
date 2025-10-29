import { createFileRoute } from '@tanstack/react-router';
import { McpIntegrationsPage } from '@/pages/admin-settings/integrations-settings/ui/mcp-integrations-page';

export const Route = createFileRoute('/_authenticated/admin-settings/integrations')({
  component: RouteComponent,
});

function RouteComponent() {
  return <McpIntegrationsPage />;
}
