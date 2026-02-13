import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useSkillsControllerAssignMcpIntegration,
  getSkillsControllerListSkillMcpIntegrationsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showSuccess, showError } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

/**
 * Hook to assign an MCP integration to a skill with optimistic updates
 */
export function useAssignMcpIntegration(
  availableIntegrations?: McpIntegrationResponseDto[],
) {
  const { t } = useTranslation('skill');
  const queryClient = useQueryClient();

  return useSkillsControllerAssignMcpIntegration({
    mutation: {
      onMutate: async ({ skillId, integrationId }) => {
        await queryClient.cancelQueries({
          queryKey:
            getSkillsControllerListSkillMcpIntegrationsQueryKey(skillId),
        });

        const previousAssignments = queryClient.getQueryData(
          getSkillsControllerListSkillMcpIntegrationsQueryKey(skillId),
        );

        queryClient.setQueryData(
          getSkillsControllerListSkillMcpIntegrationsQueryKey(skillId),
          (old: McpIntegrationResponseDto[] | undefined) => {
            if (!old) return old;
            const integration = availableIntegrations?.find(
              (i) => i.id === integrationId,
            );
            return integration ? [...old, integration] : old;
          },
        );

        return { previousAssignments };
      },
      onError: (error, variables, context) => {
        if (context?.previousAssignments) {
          queryClient.setQueryData(
            getSkillsControllerListSkillMcpIntegrationsQueryKey(
              variables.skillId,
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
          showError(t('mcpIntegrations.errors.failedToConnect'));
        }
      },
      onSuccess: () => {
        showSuccess(t('mcpIntegrations.success.connected'));
      },
      onSettled: (_data, _error, variables) => {
        void queryClient.invalidateQueries({
          queryKey: getSkillsControllerListSkillMcpIntegrationsQueryKey(
            variables.skillId,
          ),
        });
      },
    },
  });
}
