import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useAgentsControllerAssignMcpIntegration,
  getAgentsControllerListAgentMcpIntegrationsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showSuccess, showError } from '@/shared/lib/toast';

/**
 * Hook to assign an MCP integration to an agent with optimistic updates
 */
export function useAssignMcpIntegration(
  availableIntegrations?: McpIntegrationResponseDto[],
) {
  const { t } = useTranslation('agent');
  const queryClient = useQueryClient();

  return useAgentsControllerAssignMcpIntegration({
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

        // Optimistically update by adding integration
        queryClient.setQueryData(
          getAgentsControllerListAgentMcpIntegrationsQueryKey(agentId),
          (old: McpIntegrationResponseDto[] | undefined) => {
            if (!old) return old;
            // Find the integration from available list
            const integration = availableIntegrations?.find(
              (i) => i.id === integrationId,
            );
            return integration ? [...old, integration] : old;
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
        showError(t('mcpIntegrations.errors.failedToConnect'));
      },
      onSuccess: () => {
        showSuccess(t('mcpIntegrations.success.connected'));
      },
      onSettled: (_data, _error, variables) => {
        // Always refetch after mutation
        void queryClient.invalidateQueries({
          queryKey: getAgentsControllerListAgentMcpIntegrationsQueryKey(
            variables.agentId,
          ),
        });
      },
    },
  });
}
