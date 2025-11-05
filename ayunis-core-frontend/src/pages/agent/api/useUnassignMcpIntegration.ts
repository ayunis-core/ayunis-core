import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  useAgentsControllerUnassignMcpIntegration,
  getAgentsControllerListAgentMcpIntegrationsQueryKey,
} from "@/shared/api/generated/ayunisCoreAPI";
import type { McpIntegrationResponseDto } from "@/shared/api/generated/ayunisCoreAPI.schemas";
import { showSuccess, showError } from "@/shared/lib/toast";

/**
 * Hook to unassign an MCP integration from an agent with optimistic updates
 */
export function useUnassignMcpIntegration() {
  const { t } = useTranslation("agent");
  const queryClient = useQueryClient();

  return useAgentsControllerUnassignMcpIntegration({
    mutation: {
      onMutate: async ({ agentId, integrationId }) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({
          queryKey:
            getAgentsControllerListAgentMcpIntegrationsQueryKey(agentId),
        });

        // Snapshot previous value
        const previousAssignments = queryClient.getQueryData(
          getAgentsControllerListAgentMcpIntegrationsQueryKey(agentId),
        );

        // Optimistically update by removing integration
        queryClient.setQueryData(
          getAgentsControllerListAgentMcpIntegrationsQueryKey(agentId),
          (old: McpIntegrationResponseDto[] | undefined) => {
            if (!old) return old;
            return old.filter((i) => i.id !== integrationId);
          },
        );

        // Return context with snapshot
        return { previousAssignments };
      },
      onError: (_error, variables, context) => {
        // Rollback on error
        if (context?.previousAssignments) {
          queryClient.setQueryData(
            getAgentsControllerListAgentMcpIntegrationsQueryKey(
              variables.agentId,
            ),
            context.previousAssignments,
          );
        }
        showError(t("mcpIntegrations.errors.failedToDisconnect"));
      },
      onSuccess: () => {
        showSuccess(t("mcpIntegrations.success.disconnected"));
      },
      onSettled: (_data, _error, variables) => {
        // Always refetch after mutation
        queryClient.invalidateQueries({
          queryKey: getAgentsControllerListAgentMcpIntegrationsQueryKey(
            variables.agentId,
          ),
        });
      },
    },
  });
}
