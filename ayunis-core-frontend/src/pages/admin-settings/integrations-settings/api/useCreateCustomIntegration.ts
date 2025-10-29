import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useMcpIntegrationsControllerCreateCustom,
  getMcpIntegrationsControllerListQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";
import type { CreateCustomIntegrationFormData } from "../model/types";

export function useCreateCustomIntegration(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation("admin-settings-integrations");

  const mutation = useMcpIntegrationsControllerCreateCustom({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        toast.success(t("integrations.createCustomIntegration.success"));
        onSuccess?.();
      },
      onError: (error: any) => {
        toast.error(
          t("integrations.createCustomIntegration.error", {
            message: error.response?.data?.message || error.message,
          }),
        );
      },
    },
  });

  function createCustomIntegration(data: CreateCustomIntegrationFormData) {
    mutation.mutate({ data });
  }

  return {
    createCustomIntegration,
    isCreating: mutation.isPending,
  };
}
