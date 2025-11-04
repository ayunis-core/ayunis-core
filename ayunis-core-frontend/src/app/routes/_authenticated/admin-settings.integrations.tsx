import { createFileRoute } from "@tanstack/react-router";
import { McpIntegrationsPage } from "@/pages/admin-settings/integrations-settings/ui/mcp-integrations-page";
import { appControllerIsCloud } from "@/shared/api";

export const Route = createFileRoute(
  "/_authenticated/admin-settings/integrations",
)({
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
  return <McpIntegrationsPage isCloud={isCloud} />;
}
