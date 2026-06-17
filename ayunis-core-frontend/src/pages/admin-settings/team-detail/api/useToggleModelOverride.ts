import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  useTeamsControllerUpdateTeam,
  getTeamsControllerGetTeamQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { TeamResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useToggleModelOverride(teamId: string, teamName: string) {
  const { t } = useTranslation('admin-settings-teams');
  const queryClient = useQueryClient();
  const router = useRouter();

  const queryKey = getTeamsControllerGetTeamQueryKey(teamId);

  const mutation = useTeamsControllerUpdateTeam({
    mutation: {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<TeamResponseDto>(queryKey);

        if (previous) {
          queryClient.setQueryData<TeamResponseDto>(queryKey, {
            ...previous,
            modelOverrideEnabled:
              variables.data.modelOverrideEnabled ??
              previous.modelOverrideEnabled,
          });
        }

        return { previous };
      },
      onSuccess: () => {
        showSuccess(t('teamDetail.models.overrideToggleSuccess'));
      },
      onError: (error: unknown, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData<TeamResponseDto>(queryKey, context.previous);
        }

        const errorObj = error as { response?: { data?: { code?: string } } };
        const errorCode = errorObj.response?.data?.code;

        if (errorCode === 'TEAM_NOT_FOUND') {
          showError(t('teamDetail.models.overrideToggleNotFound'));
        } else {
          showError(t('teamDetail.models.overrideToggleError'));
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey });
        void router.invalidate();
      },
    },
  });

  function toggleModelOverride(enabled: boolean) {
    const cached = queryClient.getQueryData<TeamResponseDto>(queryKey);
    const currentName = cached?.name ?? teamName;

    mutation.mutate({
      id: teamId,
      data: { name: currentName, modelOverrideEnabled: enabled },
    });
  }

  return {
    toggleModelOverride,
    isToggling: mutation.isPending,
  };
}
