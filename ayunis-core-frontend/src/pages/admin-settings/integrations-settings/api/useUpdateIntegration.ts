import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerUpdate,
  getMcpIntegrationsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  McpIntegration,
  UpdateIntegrationFormData,
} from '@/pages/admin-settings/integrations-settings/model/types';
import { upsertIntegration } from '@/pages/admin-settings/integrations-settings/lib/integration-pages';
import extractErrorData from '@/shared/api/extract-error-data';
import { hasOAuthConfiguration } from '@/shared/lib/mcp-oauth';
import { trackProbedIntegrationConnection } from '@/shared/lib/openpanel-integrations';

// onSaved fires whenever the save went through, including when the connection
// test then failed; onSuccess only when the dialog can close.
export function useUpdateIntegration(
  onSuccess?: () => void,
  onSaved?: (integration: McpIntegration) => void,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-integrations');

  const mutation = useMcpIntegrationsControllerUpdate({
    mutation: {
      onSuccess: (integration, variables) => {
        // Put the saved integration in the list before the page jumps to it;
        // otherwise the out-of-range page clamp fires before the refetch lands.
        queryClient.setQueryData<McpIntegration[]>(
          getMcpIntegrationsControllerListQueryKey(),
          (current) => current && upsertIntegration(current, integration),
        );
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        onSaved?.(integration);
        const configSchema = integration.configSchema as Parameters<
          typeof hasOAuthConfiguration
        >[0];
        const probedConnection =
          hasConnectionChanges(variables.data) &&
          !hasOAuthConfiguration(configSchema) &&
          integration.userAuthorizationRequired !== true;
        if (probedConnection) trackProbedIntegrationConnection(integration);
        if (probedConnection && integration.connectionStatus === 'error') {
          showError(
            integration.lastConnectionError
              ? t('integrations.updateIntegration.connectionFailed', {
                  message: integration.lastConnectionError,
                })
              : t('integrations.updateIntegration.connectionFailedGeneric'),
          );
          return;
        }
        showSuccess(t('integrations.updateIntegration.success'));
        onSuccess?.();
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'MCP_INTEGRATION_NOT_FOUND':
              showError(t('integrations.updateIntegration.notFound'));
              break;
            case 'INVALID_SERVER_URL':
              showError(t('integrations.updateIntegration.invalidServerUrl'));
              break;
            case 'MCP_VALIDATION_FAILED':
              showError(
                t('integrations.updateIntegration.invalidConfiguration'),
              );
              break;
            case 'MCP_MISSING_REQUIRED_CONFIG':
              showError(
                t(
                  'integrations.updateIntegration.missingRequiredConfiguration',
                ),
              );
              break;
            default:
              showError(t('integrations.updateIntegration.error'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('integrations.updateIntegration.error'));
        }
      },
    },
  });

  function updateIntegration(id: string, data: UpdateIntegrationFormData) {
    mutation.mutate({ id, data });
  }

  return {
    updateIntegration,
    isUpdating: mutation.isPending,
  };
}

function hasConnectionChanges(data: UpdateIntegrationFormData): boolean {
  return [
    data.serverUrl,
    data.configSchema,
    data.orgConfigValues,
    data.credentials,
    data.authHeaderName,
  ].some((value) => value !== undefined);
}
