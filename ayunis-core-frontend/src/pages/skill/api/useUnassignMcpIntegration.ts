import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useSkillsControllerUnassignMcpIntegration,
  getSkillsControllerListSkillMcpIntegrationsQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegrationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showSuccess, showError } from '@/shared/lib/toast';
import extractErrorData from '@/shared/api/extract-error-data';

/**
 * Hook to unassign an MCP integration from a skill with optimistic updates
 */
export function useUnassignMcpIntegration() {
  const { t } = useTranslation('skill');
  const queryClient = useQueryClient();

  return useSkillsControllerUnassignMcpIntegration({
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
            return old.filter((i) => i.id !== integrationId);
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
        console.error('Unassign MCP integration failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'MCP_INTEGRATION_NOT_ASSIGNED':
              showError(t('mcpIntegrations.errors.notAssigned'));
              break;
            default:
              showError(t('mcpIntegrations.errors.failedToDisconnect'));
          }
        } catch {
          showError(t('mcpIntegrations.errors.failedToDisconnect'));
        }
      },
      onSuccess: () => {
        showSuccess(t('mcpIntegrations.success.disconnected'));
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
