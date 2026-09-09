import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getSkillsControllerFindAllQueryKey,
  skillsControllerCreate,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { personalSkillListParams } from '@/shared/api/skill-scopes';

export type CreateSkillData = {
  name: string;
  shortDescription: string;
  instructions: string;
};

export function useCreateSkill() {
  const { t } = useTranslation('skills');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: (data: CreateSkillData) =>
      skillsControllerCreate({ ...data, ownerType: 'personal' }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindAllQueryKey(personalSkillListParams),
      });
      void router.navigate({ to: '/skills/$id', params: { id: data.id } });
    },
    onError: (error) => {
      try {
        extractErrorData(error);
        showError(t('create.error'));
      } catch {
        showError(t('create.error'));
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindAllQueryKey(personalSkillListParams),
      });
      void router.invalidate();
    },
  });

  return {
    createSkill: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
