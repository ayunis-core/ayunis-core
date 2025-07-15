import {
  getSubscriptionsControllerGetSubscriptionQueryKey,
  useSubscriptionsControllerCancelSubscription,
} from "@/shared/api";
import extractErrorData from "@/shared/api/extract-error-data";
import { showError, showSuccess } from "@/shared/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export default function useSubscriptionCancel() {
  const { t } = useTranslation("admin-settings-billing");
  const queryClient = useQueryClient();
  const router = useRouter();
  const { mutate: cancelSubscription } =
    useSubscriptionsControllerCancelSubscription({
      mutation: {
        onSuccess: () => {
          showSuccess(t("subscription.cancelSuccess"));
        },
        onError: (error) => {
          const { code } = extractErrorData(error);
          if (code === "SUBSCRIPTION_NOT_FOUND") {
            showError(t("subscription.cancelErrorSubscriptionNotFound"));
          } else {
            showError(t("subscription.cancelError"));
          }
        },
        onSettled: () => {
          queryClient.invalidateQueries({
            queryKey: getSubscriptionsControllerGetSubscriptionQueryKey(),
          });
          router.invalidate();
        },
      },
    });

  return { cancelSubscription };
}
