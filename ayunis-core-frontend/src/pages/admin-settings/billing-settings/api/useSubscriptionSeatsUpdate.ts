import {
  getSubscriptionsControllerGetSubscriptionQueryKey,
  useSubscriptionsControllerUpdateSeats,
} from "@/shared/api";
import extractErrorData from "@/shared/api/extract-error-data";
import { showError, showSuccess } from "@/shared/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export default function useSubscriptionSeatsUpdate() {
  const { t } = useTranslation("admin-settings-billing");
  const queryClient = useQueryClient();
  const router = useRouter();
  const { mutate, isPending } = useSubscriptionsControllerUpdateSeats({
    mutation: {
      onSuccess: () => {
        showSuccess(t("licenseSeats.updateSeatsSuccess"));
      },
      onError: (error) => {
        const { code } = extractErrorData(error);
        switch (code) {
          case "SUBSCRIPTION_NOT_FOUND":
            showError(t("licenseSeats.updateSeatsErrorSubscriptionNotFound"));
            break;
          case "TOO_MANY_USED_SEATS":
            showError(t("licenseSeats.updateSeatsErrorTooManyUsedSeats"));
            break;
          case "SUBSCRIPTION_ALREADY_CANCELLED":
            showError(
              t("licenseSeats.updateSeatsErrorSubscriptionAlreadyCancelled"),
            );
            break;
          default:
            showError(t("licenseSeats.updateSeatsErrorUnexpectedError"));
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

  function updateSeats(noOfSeats: number) {
    mutate({
      data: {
        noOfSeats,
      },
    });
  }

  return { updateSeats, isPending };
}
