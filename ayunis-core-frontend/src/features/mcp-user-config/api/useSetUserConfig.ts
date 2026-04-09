import { useQueryClient } from '@tanstack/react-query';
import {
  getMcpIntegrationsControllerGetUserConfigQueryKey,
  useMcpIntegrationsControllerSetUserConfig,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

interface SetUserConfigMessages {
  success: string;
  error: string;
  notFound: string;
}

export function useSetUserConfig(
  integrationId: string,
  messages: SetUserConfigMessages,
  onSuccess?: () => void,
) {
  const queryClient = useQueryClient();

  const mutation = useMcpIntegrationsControllerSetUserConfig({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey:
            getMcpIntegrationsControllerGetUserConfigQueryKey(integrationId),
        });
        showSuccess(messages.success);
        onSuccess?.();
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'MCP_INTEGRATION_NOT_FOUND') {
            showError(messages.notFound);
          } else {
            showError(messages.error);
          }
        } catch {
          showError(messages.error);
        }
      },
    },
  });

  function setUserConfig(configValues: Record<string, string>) {
    mutation.mutate({ id: integrationId, data: { configValues } });
  }

  return {
    setUserConfig,
    isSaving: mutation.isPending,
  };
}
