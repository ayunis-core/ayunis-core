import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey,
  useTeamPermittedModelsControllerSetTeamDefaultModel,
  type PermittedLanguageModelResponseDto,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { clearModelModeDefaultCache } from '@/features/model-mode-defaults';
import { invalidateTeamModelAccessQueries } from './invalidateTeamModelAccessQueries';

const ERROR_KEYS: Record<string, string> = {
  MODEL_NOT_FOUND: 'models.defaultModel.modelNotFound',
  MODEL_INVALID: 'models.defaultModel.modelInvalid',
};

export function useSetTeamDefaultModel(teamId: string) {
  const { t } = useTranslation('admin-settings-teams');
  const queryClient = useQueryClient();
  const grantsKey =
    getTeamPermittedModelsControllerListTeamPermittedModelsQueryKey(teamId);

  const mutation = useTeamPermittedModelsControllerSetTeamDefaultModel({
    mutation: {
      // Show the new default (and the cleared mode default) right away.
      onMutate: async ({ data }) => {
        await queryClient.cancelQueries({ queryKey: grantsKey });
        const previousGrants =
          queryClient.getQueryData<PermittedLanguageModelResponseDto[]>(
            grantsKey,
          );
        queryClient.setQueryData<PermittedLanguageModelResponseDto[]>(
          grantsKey,
          (grants) =>
            grants?.map((grant) => ({
              ...grant,
              isDefault: grant.id === data.permittedModelId,
            })),
        );
        const restoreMode = await clearModelModeDefaultCache(queryClient, {
          level: 'team',
          teamId,
        });
        return { previousGrants, restoreMode };
      },
      onSuccess: () => {
        showSuccess(t('models.defaultModel.success'));
      },
      onError: (error, _variables, context) => {
        queryClient.setQueryData(grantsKey, context?.previousGrants);
        context?.restoreMode();
        try {
          const { code } = extractErrorData(error);
          showError(t(ERROR_KEYS[code] ?? 'models.defaultModel.error'));
        } catch {
          showError(t('models.defaultModel.error'));
        }
      },
      onSettled: async () => {
        await invalidateTeamModelAccessQueries(queryClient, teamId);
      },
    },
  });

  function setTeamDefaultModel(permittedModelId: string) {
    mutation.mutate({ teamId, data: { permittedModelId } });
  }

  return {
    setTeamDefaultModel,
    isSetting: mutation.isPending,
  };
}
