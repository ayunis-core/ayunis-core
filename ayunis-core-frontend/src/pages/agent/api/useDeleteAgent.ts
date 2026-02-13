import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  agentsControllerDelete,
  getAgentsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useRouter } from '@tanstack/react-router';
import extractErrorData from '@/shared/api/extract-error-data';
interface DeleteAgentParams {
  id: string;
}

export function useDeleteAgent() {
  const { t } = useTranslation('agents');
  const queryClient = useQueryClient();

  const router = useRouter();
  return useMutation({
    mutationFn: async ({ id }: DeleteAgentParams) => {
      await agentsControllerDelete(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getAgentsControllerFindAllQueryKey(),
      });
      void router.invalidate();
      showSuccess(t('delete.success'));
    },
    onError: (error) => {
      console.error('Delete agent failed:', error);
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'AGENT_NOT_FOUND':
            showError(t('delete.notFound'));
            break;
          default:
            showError(t('delete.error'));
        }
      } catch {
        // Non-AxiosError (network failure, request cancellation, etc.)
        showError(t('delete.error'));
      }
    },
  });
}
