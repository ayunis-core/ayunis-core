import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  agentsControllerDelete,
  getAgentsControllerFindAllQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";

interface DeleteAgentParams {
  id: string;
}

export function useDeleteAgent() {
  const { t } = useTranslation("agents");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: DeleteAgentParams) => {
      await agentsControllerDelete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [getAgentsControllerFindAllQueryKey()],
      });
      toast.success(t("delete.success"));
    },
    onError: () => {
      toast.error(t("delete.error"));
    },
  });
}
