import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useMcpIntegrationsControllerDelete,
  getMcpIntegrationsControllerListQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";

export function useDeleteIntegration(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation("admin-settings-integrations");

  const mutation = useMcpIntegrationsControllerDelete({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        toast.success(t("integrations.deleteIntegration.success"));
        onSuccess?.();
      },
      onError: (error: any) => {
        toast.error(
          t("integrations.deleteIntegration.error", {
            message: error.response?.data?.message || error.message,
          }),
        );
      },
    },
  });

  function deleteIntegration(id: string) {
    mutation.mutate({ id });
  }

  return {
    deleteIntegration,
    isDeleting: mutation.isPending,
  };
}
