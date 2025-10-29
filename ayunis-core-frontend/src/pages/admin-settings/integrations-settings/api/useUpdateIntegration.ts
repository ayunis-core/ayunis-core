import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useMcpIntegrationsControllerUpdate,
  getMcpIntegrationsControllerListQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";
import type { UpdateIntegrationFormData } from "../model/types";

export function useUpdateIntegration(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation("admin-settings-integrations");

  const mutation = useMcpIntegrationsControllerUpdate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        toast.success(t("integrations.updateIntegration.success"));
        onSuccess?.();
      },
      onError: (error: any) => {
        toast.error(
          t("integrations.updateIntegration.error", {
            message: error.response?.data?.message || error.message,
          }),
        );
      },
    },
  });

  function updateIntegration(id: string, data: UpdateIntegrationFormData) {
    mutation.mutate({ id, data });
  }

  return {
    updateIntegration,
    isUpdating: mutation.isPending,
  };
}
