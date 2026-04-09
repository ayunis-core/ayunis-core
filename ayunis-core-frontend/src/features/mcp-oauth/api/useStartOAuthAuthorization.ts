import {
  getMcpIntegrationsControllerGetOAuthStatusQueryKey,
  getMcpIntegrationsControllerListAvailableQueryKey,
  mcpIntegrationsControllerStartOAuthAuthorize,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface StartOAuthAuthorizationMessages {
  errorToast: string;
  errorClientNotConfigured: string;
  errorIntegrationNotFound: string;
}

interface StartOAuthAuthorizationParams {
  integrationId: string;
}

function getCurrentReturnTo() {
  if (typeof window === 'undefined') {
    return '/';
  }

  return `${window.location.pathname}${window.location.search}`;
}

export function useStartOAuthAuthorization(
  messages: StartOAuthAuthorizationMessages,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ integrationId }: StartOAuthAuthorizationParams) => {
      return mcpIntegrationsControllerStartOAuthAuthorize(integrationId, {
        returnTo: getCurrentReturnTo(),
      });
    },
    onSuccess: (response, { integrationId }) => {
      void queryClient.invalidateQueries({
        queryKey: getMcpIntegrationsControllerListAvailableQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey:
          getMcpIntegrationsControllerGetOAuthStatusQueryKey(integrationId),
      });
      window.location.assign(response.authorizationUrl);
    },
    onError: (error: unknown) => {
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'MCP_OAUTH_CLIENT_NOT_CONFIGURED':
            showError(messages.errorClientNotConfigured);
            break;
          case 'MCP_INTEGRATION_NOT_FOUND':
            showError(messages.errorIntegrationNotFound);
            break;
          default:
            showError(messages.errorToast);
        }
      } catch {
        showError(messages.errorToast);
      }
    },
  });
}
