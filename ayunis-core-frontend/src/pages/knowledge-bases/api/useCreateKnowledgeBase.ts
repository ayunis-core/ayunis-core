import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  getKnowledgeBasesControllerFindAllQueryKey,
  knowledgeBasesControllerCreate,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { personalKnowledgeBaseListParams } from '@/shared/api/knowledge-base-scopes';
import { showError, showSuccess } from '@/shared/lib/toast';
import { toOwnerChoice, type OwnerOption } from '@/features/resource-ownership';

export type CreateKnowledgeBaseData = {
  name: string;
  description?: string;
  owner?: OwnerOption;
};

const PERSONAL_OWNER: OwnerOption = { type: 'personal' };

export function useCreateKnowledgeBase() {
  const { t } = useTranslation('knowledge-bases');
  const { t: tOwnership } = useTranslation('resource-ownership');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: ({
      owner = PERSONAL_OWNER,
      ...data
    }: CreateKnowledgeBaseData) =>
      knowledgeBasesControllerCreate({
        ...toOwnerChoice(owner),
        name: data.name,
        description: data.description ?? '',
      }),
    onSuccess: (data, { owner = PERSONAL_OWNER }) => {
      void queryClient.invalidateQueries({
        queryKey: getKnowledgeBasesControllerFindAllQueryKey(
          personalKnowledgeBaseListParams,
        ),
      });
      void router.invalidate();
      if (owner.type === 'personal') {
        showSuccess(t('create.success'));
        return;
      }
      showSuccess(
        tOwnership(`created.${owner.type}`, {
          name: data.name,
          team: owner.teamName,
        }),
      );
      void router.navigate({
        to: '/knowledge-bases',
        search: { tab: 'shared' },
      });
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        showError(
          t(
            code === 'VALIDATION_ERROR'
              ? 'create.validationError'
              : 'create.error',
          ),
        );
      } catch {
        showError(t('create.error'));
      }
    },
  });

  return {
    createKnowledgeBase: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
