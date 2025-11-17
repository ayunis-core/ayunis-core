import { createFileRoute } from "@tanstack/react-router";
import {
  getUsageControllerGetUsageConfigQueryOptions,
} from "@/shared/api/generated/ayunisCoreAPI";
import UsageSettingsPage from "@/pages/admin-settings/usage-settings";

export const Route = createFileRoute("/_authenticated/admin-settings/usage")({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    const usageConfigQueryOptions =
      getUsageControllerGetUsageConfigQueryOptions();
    await queryClient.fetchQuery(usageConfigQueryOptions);
  },
});

function RouteComponent() {
  return <UsageSettingsPage />;
}
