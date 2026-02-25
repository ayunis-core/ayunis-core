import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useAgentMcpIntegrationsControllerUnassignMcpIntegration,
  getAgentMcpIntegrationsControllerListAgentMcpIntegrationsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showSuccess, showError } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

/**
 * Hook to unassign an MCP integration from an agent with optimistic updates
 */
export function useUnassignMcpIntegration() {
  const { t } = useTranslation('agent');
  const queryClient = useQueryClient();

  return useAgentMcpIntegrationsControllerUnassignMcpIntegration({
    mutation: {
      onMutate: async ({ agentId, integrationId }) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({
          queryKey:
            getAgentMcpIntegrationsControllerListAgentMcpIntegrationsQueryKey(
              agentId,
            ),
        });

        // Snapshot previous value
        const previousAssignments = queryClient.getQueryData(
          getAgentMcpIntegrationsControllerListAgentMcpIntegrationsQueryKey(
            agentId,
          ),
        );

        // Optimistically update by removing integration
        queryClient.setQueryData(
          getAgentMcpIntegrationsControllerListAgentMcpIntegrationsQueryKey(
            agentId,
          ),
          (old: McpIntegrationResponseDto[] | undefined) => {
            if (!old) return old;
            return old.filter((i) => i.id !== integrationId);
          },
        );

        // Return context with snapshot
        return { previousAssignments };
      },
      onError: (error, variables, context) => {
        // Rollback on error
        if (context?.previousAssignments) {
          queryClient.setQueryData(
            getAgentMcpIntegrationsControllerListAgentMcpIntegrationsQueryKey(
              variables.agentId,
            ),
            context.previousAssignments,
          );
        }
        console.error('Unassign MCP integration failed:', error);
        try {
          const { code } = extractErrorData(error);
          if (code === 'MCP_INTEGRATION_NOT_ASSIGNED') {
            showError(t('mcpIntegrations.errors.notAssigned'));
          } else {
            showError(t('mcpIntegrations.errors.failedToDisconnect'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('mcpIntegrations.errors.failedToDisconnect'));
        }
      },
      onSuccess: () => {
        showSuccess(t('mcpIntegrations.success.disconnected'));
      },
      onSettled: (_data, _error, variables) => {
        // Always refetch after mutation
        void queryClient.invalidateQueries({
          queryKey:
            getAgentMcpIntegrationsControllerListAgentMcpIntegrationsQueryKey(
              variables.agentId,
            ),
        });
      },
    },
  });
}
