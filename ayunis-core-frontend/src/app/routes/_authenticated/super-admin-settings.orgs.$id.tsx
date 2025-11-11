import { createFileRoute } from "@tanstack/react-router";
import {
  superAdminOrgsControllerGetOrgById,
  getSuperAdminOrgsControllerGetOrgByIdQueryKey,
  superAdminSubscriptionsControllerGetSubscription,
  getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey,
  superAdminUsersControllerGetUsersByOrgId,
  getSuperAdminUsersControllerGetUsersByOrgIdQueryKey,
} from "@/shared/api";
import SuperAdminSettingsOrgPage from "@/pages/super-admin-settings/org";
import extractErrorData from "@/shared/api/extract-error-data";

export const Route = createFileRoute(
  "/_authenticated/super-admin-settings/orgs/$id",
)({
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params: { id } }) => {
    const org = await queryClient.fetchQuery({
      queryKey: getSuperAdminOrgsControllerGetOrgByIdQueryKey(id),
      queryFn: () => superAdminOrgsControllerGetOrgById(id),
    });
    const users = await queryClient.fetchQuery({
      queryKey: getSuperAdminUsersControllerGetUsersByOrgIdQueryKey(id),
      queryFn: () => superAdminUsersControllerGetUsersByOrgId(id),
    });
    const subscription = await queryClient
      .fetchQuery({
        queryKey:
          getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey(id),
        queryFn: () => superAdminSubscriptionsControllerGetSubscription(id),
      })
      .catch((error) => {
        const { code } = extractErrorData(error);
        if (code === "SUBSCRIPTION_NOT_FOUND") {
          return null;
        }
        throw error;
      });
    return {
      org,
      users,
      subscription,
    };
  },
});

function RouteComponent() {
  const { org, users, subscription } = Route.useLoaderData();
  return (
    <SuperAdminSettingsOrgPage
      org={org}
      users={users.users}
      subscription={subscription}
    />
  );
}
