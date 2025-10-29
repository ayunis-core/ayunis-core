import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useMcpIntegrationsControllerCreatePredefined,
  getMcpIntegrationsControllerListQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";
import type { CreatePredefinedIntegrationFormData } from "../model/types";

export function useCreatePredefinedIntegration(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation("admin-settings-integrations");

  const mutation = useMcpIntegrationsControllerCreatePredefined({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        toast.success(t("integrations.createPredefinedIntegration.success"));
        onSuccess?.();
      },
      onError: (error: any) => {
        toast.error(
          t("integrations.createPredefinedIntegration.error", {
            message: error.response?.data?.message || error.message,
          }),
        );
      },
    },
  });

  function createPredefinedIntegration(
    data: CreatePredefinedIntegrationFormData,
  ) {
    mutation.mutate({ data });
  }

  return {
    createPredefinedIntegration,
    isCreating: mutation.isPending,
  };
}
