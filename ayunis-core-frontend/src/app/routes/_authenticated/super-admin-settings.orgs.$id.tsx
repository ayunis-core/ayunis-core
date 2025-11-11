import { createFileRoute } from "@tanstack/react-router";
import {
  superAdminOrgsControllerGetOrgById,
  getSuperAdminOrgsControllerGetOrgByIdQueryKey,
  superAdminSubscriptionsControllerGetSubscription,
  getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey,
  superAdminUsersControllerGetUsersByOrgId,
  getSuperAdminUsersControllerGetUsersByOrgIdQueryKey,
} from "@/shared/api";

export const Route = createFileRoute(
  "/_authenticated/super-admin-settings/orgs/$id",
)({
  component: RouteComponent,
  loader: async ({ context: { queryClient }, params: { id } }) => {
    return {
      org: await queryClient.fetchQuery({
        queryKey: getSuperAdminOrgsControllerGetOrgByIdQueryKey(id),
        queryFn: () => superAdminOrgsControllerGetOrgById(id),
      }),
      users: await queryClient.fetchQuery({
        queryKey: getSuperAdminUsersControllerGetUsersByOrgIdQueryKey(id),
        queryFn: () => superAdminUsersControllerGetUsersByOrgId(id),
      }),
      subscription: await queryClient.fetchQuery({
        queryKey:
          getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey(id),
        queryFn: () => superAdminSubscriptionsControllerGetSubscription(id),
      }),
    };
  },
});

function RouteComponent() {
  return <div>Hello "/_authenticated/super-admin-settings/orgs/$id"!</div>;
}
