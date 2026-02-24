import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useAgentMcpIntegrationsControllerAssignMcpIntegration,
  getAgentMcpIntegrationsControllerListAgentMcpIntegrationsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showSuccess, showError } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

/**
 * Hook to assign an MCP integration to an agent with optimistic updates
 */
export function useAssignMcpIntegration(
  availableIntegrations?: McpIntegrationResponseDto[],
) {
  const { t } = useTranslation('agent');
  const queryClient = useQueryClient();

  return useAgentMcpIntegrationsControllerAssignMcpIntegration({
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

        // Optimistically update by adding integration
        queryClient.setQueryData(
          getAgentMcpIntegrationsControllerListAgentMcpIntegrationsQueryKey(
            agentId,
          ),
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
        console.error('Assign MCP integration failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'MCP_INTEGRATION_NOT_FOUND':
              showError(t('mcpIntegrations.errors.integrationNotFound'));
              break;
            case 'MCP_INTEGRATION_ALREADY_ASSIGNED':
              showError(t('mcpIntegrations.errors.alreadyAssigned'));
              break;
            case 'MCP_INTEGRATION_DISABLED':
              showError(t('mcpIntegrations.errors.integrationDisabled'));
              break;
            default:
              showError(t('mcpIntegrations.errors.failedToConnect'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('mcpIntegrations.errors.failedToConnect'));
        }
      },
      onSuccess: () => {
        showSuccess(t('mcpIntegrations.success.connected'));
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
