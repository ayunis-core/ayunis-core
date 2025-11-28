import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerDelete,
  getMcpIntegrationsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';

export function useDeleteIntegration(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-integrations');

  const mutation = useMcpIntegrationsControllerDelete({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        toast.success(t('integrations.deleteIntegration.success'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        const errorMessage =
          (
            error as {
              response?: { data?: { message?: string } };
              message?: string;
            }
          )?.response?.data?.message ||
          (error as { message?: string })?.message ||
          'Unknown error';
        toast.error(
          t('integrations.deleteIntegration.error', {
            message: errorMessage,
          }),
        );
      },
    },
  });

  function deleteIntegration(id: string) {
    mutation.mutate({ id });
  }

  return {
    deleteIntegration,
    isDeleting: mutation.isPending,
  };
}
