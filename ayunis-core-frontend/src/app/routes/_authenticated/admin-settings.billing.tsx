import { createFileRoute } from "@tanstack/react-router";
import BillingSettingsPage from "@/pages/admin-settings/billing-settings/ui/BillingSettingsPage";
import {
  getSubscriptionsControllerGetSubscriptionQueryKey,
  subscriptionsControllerGetCurrentPrice,
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
      const subscriptionPrice = await subscriptionsControllerGetCurrentPrice();
      const subscription = await queryClient
        .fetchQuery(subscriptionQueryOptions)
        .catch((error) => {
          const { code } = extractErrorData(error);
          if (code === "SUBSCRIPTION_NOT_FOUND") {
            return null;
          }
          throw error;
        });
      return { subscription, subscriptionPrice };
    } catch (error) {
      const { code } = extractErrorData(error);
      switch (code) {
        default:
          throw error;
      }
    }
  },
});

function RouteComponent() {
  const { subscription, subscriptionPrice } = Route.useLoaderData();
  return (
    <BillingSettingsPage
      subscription={subscription}
      subscriptionPrice={subscriptionPrice!}
    />
  );
}
