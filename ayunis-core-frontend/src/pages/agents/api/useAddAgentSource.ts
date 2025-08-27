import { useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsControllerAddFileSource, getAgentsControllerGetAgentSourcesQueryKey } from "@/shared/api/generated/ayunisCoreAPI";
import type { AgentsControllerAddFileSourceBody } from "@/shared/api/generated/ayunisCoreAPI.schemas";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function useAddAgentSource() {
  const { t } = useTranslation("agents");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AgentsControllerAddFileSourceBody }) => 
      agentsControllerAddFileSource(id, data),
    onSuccess: (_, variables) => {
      toast.success(t("sources.addSuccess"));
      // Invalidate agent sources query
      queryClient.invalidateQueries({
        queryKey: getAgentsControllerGetAgentSourcesQueryKey(variables.id),
      });
    },
    onError: (error) => {
      console.error("Failed to add source to agent:", error);
      toast.error(t("sources.addError"));
    },
  });
}