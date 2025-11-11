import {
  getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey,
  useSuperAdminSubscriptionsControllerUncancelSubscription,
} from "@/shared/api";
import { useTranslation } from "react-i18next";
import { showError, showSuccess } from "@/shared/lib/toast";
import extractErrorData from "@/shared/api/extract-error-data";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

export default function useSuperAdminSubscriptionUncancel(orgId: string) {
  const { t } = useTranslation("super-admin-settings-org");
  const queryClient = useQueryClient();
  const router = useRouter();
  const { mutate: uncancelSubscription } =
    useSuperAdminSubscriptionsControllerUncancelSubscription({
      mutation: {
        onSuccess: () => {
          showSuccess(t("subscription.uncancelSuccess"));
        },
        onError: (error) => {
          const { code } = extractErrorData(error);
          if (code === "SUBSCRIPTION_NOT_FOUND") {
            showError(t("subscription.uncancelErrorSubscriptionNotFound"));
          } else {
            showError(t("subscription.uncancelError"));
          }
        },
        onSettled: () => {
          queryClient.invalidateQueries({
            queryKey: getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey(
              orgId,
            ),
          });
          router.invalidate();
        },
      },
    });

  function handleUncancel() {
    uncancelSubscription({ orgId });
  }

  return { uncancelSubscription: handleUncancel };
}

