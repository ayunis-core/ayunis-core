import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  skillsControllerDelete,
  getSkillsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useRouter } from '@tanstack/react-router';
import extractErrorData from '@/shared/api/extract-error-data';

interface DeleteSkillParams {
  id: string;
}

export function useDeleteSkill() {
  const { t } = useTranslation('skills');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ id }: DeleteSkillParams) => {
      await skillsControllerDelete(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getSkillsControllerFindAllQueryKey(),
      });
      void router.invalidate();
      toast.success(t('delete.success'));
    },
    onError: (error) => {
      console.error('Delete skill failed:', error);
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'SKILL_NOT_FOUND':
            toast.error(t('delete.notFound'));
            break;
          default:
            toast.error(t('delete.error'));
        }
      } catch {
        toast.error(t('delete.error'));
      }
    },
  });
}
