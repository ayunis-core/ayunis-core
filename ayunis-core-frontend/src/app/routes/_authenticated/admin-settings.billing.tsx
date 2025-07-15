import { createFileRoute } from "@tanstack/react-router";
import BillingSettingsPage from "@/pages/admin-settings/billing-settings/ui/BillingSettingsPage";
import {
  getSubscriptionsControllerGetSubscriptionQueryKey,
  subscriptionsControllerGetSubscription,
} from "@/shared/api";
import { queryOptions } from "@tanstack/react-query";
import extractErrorData from "@/shared/api/extract-error-data";

const subscriptionQueryOptions = queryOptions({
  queryKey: getSubscriptionsControllerGetSubscriptionQueryKey(),
  queryFn: () => subscriptionsControllerGetSubscription(),
});

export const Route = createFileRoute("/_authenticated/admin-settings/billing")({
  component: RouteComponent,
  loader: async ({ context }) => {
    const queryClient = context.queryClient;
    try {
      const subscription = await queryClient.fetchQuery(
        subscriptionQueryOptions,
      );
      return { subscription };
    } catch (error) {
      const { code } = extractErrorData(error);
      if (code === "SUBSCRIPTION_NOT_FOUND") {
        return { subscription: null };
      }
      throw error;
    }
  },
});

function RouteComponent() {
  const { subscription } = Route.useLoaderData();
  return <BillingSettingsPage subscription={subscription} />;
}
