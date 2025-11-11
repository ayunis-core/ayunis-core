import {
  getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey,
  useSuperAdminSubscriptionsControllerCreateSubscription,
} from "@/shared/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { showError, showSuccess } from "@/shared/lib/toast";
import extractErrorData from "@/shared/api/extract-error-data";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

interface UseSuperAdminSubscriptionCreateProps {
  orgId: string;
}

export default function useSuperAdminSubscriptionCreate({
  orgId,
}: UseSuperAdminSubscriptionCreateProps) {
  const { t } = useTranslation("super-admin-settings-org");
  const queryClient = useQueryClient();
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(
      z.object({
        companyName: z
          .string()
          .min(1, t("subscription.createErrorCompanyNameRequired")),
        subText: z.string().optional(),
        street: z.string().min(1, t("subscription.createErrorStreetRequired")),
        houseNumber: z
          .string()
          .min(1, t("subscription.createErrorHouseNumberRequired")),
        postalCode: z
          .string()
          .min(1, t("subscription.createErrorPostalCodeRequired")),
        city: z.string().min(1, t("subscription.createErrorCityRequired")),
        country: z
          .string()
          .min(1, t("subscription.createErrorCountryRequired")),
        vatNumber: z.string().optional(),
        noOfSeats: z.coerce
          .number()
          .min(1, t("subscription.createErrorNoOfSeatsRequired")),
      }),
    ),
    defaultValues: {
      companyName: "",
      subText: "",
      street: "",
      houseNumber: "",
      postalCode: "",
      city: "",
      country: "",
      vatNumber: "",
      noOfSeats: 5,
    },
  });

  const { mutate: createSubscription } =
    useSuperAdminSubscriptionsControllerCreateSubscription({
      mutation: {
        onSuccess: () => {
          form.reset();
          showSuccess(t("subscription.createSuccess"));
        },
        onError: (error) => {
          const { code } = extractErrorData(error);
          switch (code) {
            case "SUBSCRIPTION_ALREADY_EXISTS":
              showError(t("subscription.createErrorAlreadyExists"));
              break;
            case "TOO_MANY_USED_SEATS":
              showError(t("subscription.createErrorTooManyUsedSeats"));
              break;
            default:
              showError(t("subscription.createErrorUnexpected"));
          }
        },
        onSettled: () => {
          queryClient.invalidateQueries({
            queryKey:
              getSuperAdminSubscriptionsControllerGetSubscriptionQueryKey(
                orgId,
              ),
          });
          router.invalidate();
        },
      },
    });

  const handleSubmit = form.handleSubmit(async (data) => {
    createSubscription({
      orgId,
      data,
    });
  });

  return { form, handleSubmit };
}
