import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  ownerChangeErrorKey,
  type OwnerSelection,
} from '@/features/resource-ownership';
import {
  getSkillsControllerFindAllQueryKey,
  getSkillsControllerFindOneQueryKey,
  getSkillKnowledgeBasesControllerListSkillKnowledgeBasesQueryKey,
  skillsControllerChangeOwner,
  skillsControllerPreviewOwnerChange,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalSkillListParams } from '@/shared/api/skill-scopes';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useChangeSkillOwner(skillId: string) {
  const { t } = useTranslation('ownership');
  const queryClient = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (owner: OwnerSelection) =>
      skillsControllerChangeOwner(skillId, owner),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindAllQueryKey(personalSkillListParams),
      });
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindOneQueryKey(skillId),
      });
      // The move removes links to knowledge bases of other owners.
      void queryClient.invalidateQueries({
        queryKey:
          getSkillKnowledgeBasesControllerListSkillKnowledgeBasesQueryKey(
            skillId,
          ),
      });
      void router.invalidate();
      showSuccess(t('change.success'));
    },
    onError: (error) => {
      showError(t(ownerChangeErrorKey(error)));
    },
  });

  const previewOwnerChange = async (owner: OwnerSelection) => {
    try {
      const preview = await skillsControllerPreviewOwnerChange(skillId, owner);
      return preview.unlinkedKnowledgeBaseCount;
    } catch (error) {
      showError(t(ownerChangeErrorKey(error)));
      throw error;
    }
  };

  return {
    changeOwner: mutation.mutateAsync,
    previewOwnerChange,
    isPending: mutation.isPending,
  };
}
