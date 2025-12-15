import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  getUsageControllerGetUsageConfigQueryOptions,
  appControllerIsCloud,
} from "@/shared/api/generated/ayunisCoreAPI";
import UsageSettingsPage from "@/pages/admin-settings/usage-settings";

export const Route = createFileRoute("/_authenticated/admin-settings/usage")({
  component: RouteComponent,
  beforeLoad: async () => {
    const { isCloud } = await appControllerIsCloud();
    if (isCloud) {
      throw redirect({ to: '/admin-settings/users' });
    }
  },
  loader: async ({ context: { queryClient } }) => {
    const usageConfigQueryOptions =
      getUsageControllerGetUsageConfigQueryOptions();
    await queryClient.fetchQuery(usageConfigQueryOptions);
  },
});

function RouteComponent() {
  return <UsageSettingsPage />;
}
