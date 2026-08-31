import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTeamPermittedModelsControllerCreateTeamPermittedModel } from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { invalidateTeamModelAccessQueries } from './invalidateTeamModelAccessQueries';

const ERROR_KEYS: Record<string, string> = {
  DUPLICATE_TEAM_PERMITTED_MODEL: 'teamDetail.models.enableAlreadyEnabled',
  MODEL_NOT_FOUND: 'teamDetail.models.enableModelNotFound',
  MODEL_INVALID: 'teamDetail.models.enableModelInvalid',
  MODEL_NOT_RESTRICTABLE_FOR_TEAM:
    'teamDetail.models.enableModelNotRestrictable',
  MODEL_NOT_CONFIGURED: 'teamDetail.models.enableModelNotConfigured',
  MODEL_ARCHIVED: 'teamDetail.models.enableModelArchived',
  MULTIPLE_TEAM_IMAGE_GENERATION_MODELS_NOT_ALLOWED:
    'teamDetail.models.enableImageAlreadySelected',
};

export function useCreateTeamPermittedModel(teamId: string) {
  const { t } = useTranslation('admin-settings-teams');
  const queryClient = useQueryClient();

  const mutation = useTeamPermittedModelsControllerCreateTeamPermittedModel({
    mutation: {
      onSuccess: () => {
        showSuccess(t('teamDetail.models.enableSuccess'));
      },
      onError: (error) => {
        try {
          const { code } = extractErrorData(error);
          showError(t(ERROR_KEYS[code] ?? 'teamDetail.models.enableError'));
        } catch {
          showError(t('teamDetail.models.enableError'));
        }
      },
      onSettled: async () => {
        await invalidateTeamModelAccessQueries(queryClient, teamId);
      },
    },
  });

  function createTeamPermittedModel(modelId: string) {
    mutation.mutate({ teamId, data: { modelId } });
  }

  return {
    createTeamPermittedModel,
    isCreating: mutation.isPending,
  };
}
