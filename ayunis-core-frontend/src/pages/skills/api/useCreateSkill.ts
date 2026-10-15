import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getSkillsControllerFindAllQueryKey,
  skillsControllerCreate,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';
import { personalSkillListParams } from '@/shared/api/skill-scopes';
import { toOwnerChoice, type OwnerOption } from '@/features/resource-ownership';

export type CreateSkillData = {
  name: string;
  shortDescription: string;
  instructions: string;
  owner?: OwnerOption;
};

const PERSONAL_OWNER: OwnerOption = { type: 'personal' };

function duplicateNameKey(owner: OwnerOption): string {
  return owner.type === 'personal'
    ? 'create.duplicateNamePersonal'
    : 'create.duplicateNameShared';
}

export function useCreateSkill() {
  const { t } = useTranslation('skills');
  const { t: tOwnership } = useTranslation('resource-ownership');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: ({ owner = PERSONAL_OWNER, ...data }: CreateSkillData) =>
      skillsControllerCreate({ ...data, ...toOwnerChoice(owner) }),
    onSuccess: (data, { owner = PERSONAL_OWNER }) => {
      if (owner.type !== 'personal') {
        showSuccess(
          tOwnership(`created.${owner.type}`, {
            name: data.name,
            team: owner.teamName,
          }),
        );
      }
      void router.navigate({ to: '/skills/$id', params: { id: data.id } });
    },
    onError: (error, { owner = PERSONAL_OWNER }) => {
      try {
        const { code } = extractErrorData(error);
        showError(
          t(
            code === 'DUPLICATE_SKILL_NAME'
              ? duplicateNameKey(owner)
              : 'create.error',
          ),
        );
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
