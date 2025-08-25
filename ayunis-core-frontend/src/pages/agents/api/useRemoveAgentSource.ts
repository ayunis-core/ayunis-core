import { useMutation, useQueryClient } from "@tanstack/react-query";
import { agentsControllerRemoveSource, getAgentsControllerGetAgentSourcesQueryKey } from "@/shared/api/generated/ayunisCoreAPI";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function useRemoveAgentSource() {
  const { t } = useTranslation("agents");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, sourceId }: { id: string; sourceId: string }) => 
      agentsControllerRemoveSource(id, sourceId),
    onSuccess: (_, variables) => {
      toast.success(t("sources.removeSuccess"));
      // Invalidate agent sources query
      queryClient.invalidateQueries({
        queryKey: getAgentsControllerGetAgentSourcesQueryKey(variables.id),
      });
    },
    onError: (error) => {
      console.error("Failed to remove source from agent:", error);
      toast.error(t("sources.removeError"));
    },
  });
}