import { useQueryClient } from '@tanstack/react-query';
import {
  getMcpIntegrationsControllerGetOAuthStatusQueryKey,
  getMcpIntegrationsControllerListAvailableQueryKey,
  getMcpIntegrationsControllerListQueryKey,
  useMcpIntegrationsControllerRevokeOAuth,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

interface RevokeOAuthAuthorizationMessages {
  revokeSuccess: string;
  revokeError: string;
  errorIntegrationNotFound: string;
}

export function useRevokeOAuthAuthorization(
  messages: RevokeOAuthAuthorizationMessages,
) {
  const queryClient = useQueryClient();

  return useMcpIntegrationsControllerRevokeOAuth({
    mutation: {
      onSuccess: (_, variables) => {
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListAvailableQueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerGetOAuthStatusQueryKey(
            variables.id,
          ),
        });
        showSuccess(messages.revokeSuccess);
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'MCP_INTEGRATION_NOT_FOUND') {
            showError(messages.errorIntegrationNotFound);
          } else {
            showError(messages.revokeError);
          }
        } catch {
          showError(messages.revokeError);
        }
      },
    },
  });
}
