import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getMcpIntegrationsControllerListAvailableQueryKey,
  getRoutineMcpIntegrationsControllerListQueryKey,
  routineMcpIntegrationsControllerAdd,
  routineMcpIntegrationsControllerRemove,
  useMcpIntegrationsControllerListAvailable,
  useRoutineMcpIntegrationsControllerList,
} from '@ayunis/api-client/endpoints';
import type { McpIntegrationResponseDto } from '@ayunis/api-client/schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

export function useRoutineIntegrations(routineId: string) {
  const available = useMcpIntegrationsControllerListAvailable();
  const assigned = useRoutineMcpIntegrationsControllerList(routineId);

  return {
    availableIntegrations: available.data,
    assignedIds: assigned.data?.map(({ id }) => id),
    isLoading: available.isLoading || assigned.isLoading,
    isError: available.isError || assigned.isError,
    refetch: () => {
      void available.refetch();
      void assigned.refetch();
    },
  };
}

interface ToggleIntegrationParams {
  integrationId: string;
  on: boolean;
}

/** Shows the switch in its new state at once and flips it back if saving fails. */
export function useToggleRoutineIntegration(
  routineId: string,
  availableIntegrations?: McpIntegrationResponseDto[],
) {
  const { t } = useTranslation('routines');
  const queryClient = useQueryClient();
  const queryKey = getRoutineMcpIntegrationsControllerListQueryKey(routineId);

  return useMutation({
    mutationFn: ({ integrationId, on }: ToggleIntegrationParams) =>
      on
        ? routineMcpIntegrationsControllerAdd(routineId, integrationId)
        : routineMcpIntegrationsControllerRemove(routineId, integrationId),
    onMutate: async ({ integrationId, on }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<McpIntegrationResponseDto[]>(queryKey);
      queryClient.setQueryData<McpIntegrationResponseDto[]>(
        queryKey,
        (old = []) => {
          if (!on) return old.filter(({ id }) => id !== integrationId);
          const integration = availableIntegrations?.find(
            ({ id }) => id === integrationId,
          );
          return integration ? [...old, integration] : old;
        },
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
      // What made it fail (a disconnected integration, a revoked share) may
      // change what can be switched on.
      void queryClient.invalidateQueries({
        queryKey: getMcpIntegrationsControllerListAvailableQueryKey(),
      });
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'ROUTINE_INTEGRATION_UNAVAILABLE':
            showError(t('toast.integrationUnavailable'));
            break;
          case 'ROUTINE_NOT_FOUND':
            showError(t('toast.notFound'));
            break;
          default:
            showError(t('toast.contextSaveError'));
        }
      } catch {
        showError(t('toast.contextSaveError'));
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
