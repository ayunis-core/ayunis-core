import {
  getThreadsControllerFindOneQueryKey,
  useThreadsControllerUpdateModel,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { UpdateThreadModelDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { showError } from '@/shared/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export function useUpdateThreadModel({ threadId }: { threadId: string }) {
  const { t } = useTranslation('chat');
  const queryClient = useQueryClient();
  const router = useRouter();
  const mutation = useThreadsControllerUpdateModel({
    mutation: {
      onError: () => {
        showError(t('chat.errorUpdateModel'));
      },
      onSettled: (_, __, { id: threadId }) => {
        void queryClient.invalidateQueries({
          queryKey: getThreadsControllerFindOneQueryKey(threadId),
        });
        void router.invalidate();
      },
    },
  });

  function updateModel(modelId: string): void {
    const data: UpdateThreadModelDto = {
      modelId,
    };
    mutation.mutate({ id: threadId, data });
  }

  return {
    updateModel,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}
