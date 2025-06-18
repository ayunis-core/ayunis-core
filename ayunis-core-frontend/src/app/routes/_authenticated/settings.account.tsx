import { AccountSettingsPage } from "@/pages/settings/account-settings";
import { createFileRoute } from "@tanstack/react-router";
import { authenticationControllerMe } from "@/shared/api";
import { queryOptions } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/settings/account")({
  loader: async ({ context: { queryClient } }) => {
    const data = await queryClient.ensureQueryData(
      queryOptions({
        queryKey: ["me"],
        queryFn: () => authenticationControllerMe(),
      }),
    );
    return {
      user: {
        name: data.name,
        email: data.email,
      },
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = Route.useLoaderData();
  return <AccountSettingsPage user={user} />;
}
