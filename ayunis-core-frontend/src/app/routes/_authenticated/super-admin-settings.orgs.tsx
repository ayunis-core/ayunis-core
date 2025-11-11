import { createFileRoute } from "@tanstack/react-router";
import SuperAdminOrgsPage from "@/pages/super-admin-settings/orgs";
import {
  getSuperAdminOrgsControllerGetAllOrgsQueryKey,
  superAdminOrgsControllerGetAllOrgs,
} from "@/shared/api";

export const Route = createFileRoute(
  "/_authenticated/super-admin-settings/orgs",
)({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    return {
      orgs: await queryClient.fetchQuery({
        queryKey: getSuperAdminOrgsControllerGetAllOrgsQueryKey(),
        queryFn: () => superAdminOrgsControllerGetAllOrgs(),
      }),
    };
  },
});

function RouteComponent() {
  const { orgs } = Route.useLoaderData();
  return <SuperAdminOrgsPage orgs={orgs.orgs} />;
}
