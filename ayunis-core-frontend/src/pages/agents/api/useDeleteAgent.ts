import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  agentsControllerDelete,
  getAgentsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useRouter } from '@tanstack/react-router';
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
      toast.success(t('delete.success'));
    },
    onError: () => {
      toast.error(t('delete.error'));
    },
  });
}
