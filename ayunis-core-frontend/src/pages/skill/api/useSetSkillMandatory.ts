import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getSkillsControllerFindAllQueryKey,
  getSkillsControllerFindOneQueryKey,
  skillMandatoryControllerMandatory,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalSkillListParams } from '@/shared/api/skill-scopes';
import { showError, showSuccess } from '@/shared/lib/toast';

function isThreadAiContextKey(queryKey: readonly unknown[]): boolean {
  const [path] = queryKey;
  return typeof path === 'string' && path.endsWith('/ai-context');
}

export function useSetSkillMandatory(skill: { id: string; name: string }) {
  const { t } = useTranslation('skill');
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (isMandatory: boolean) =>
      skillMandatoryControllerMandatory(skill.id, { isMandatory }),
    onSuccess: async (_data, isMandatory) => {
      showSuccess(
        t(isMandatory ? 'mandatory.toastOn' : 'mandatory.toastOff', {
          name: skill.name,
        }),
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getSkillsControllerFindOneQueryKey(skill.id),
        }),
        queryClient.invalidateQueries({
          queryKey: getSkillsControllerFindAllQueryKey(personalSkillListParams),
        }),
        queryClient.invalidateQueries({
          predicate: ({ queryKey }) => isThreadAiContextKey(queryKey),
        }),
      ]);
      await router.invalidate();
    },
    onError: () => showError(t('mandatory.error')),
  });
}
