import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerEnable,
  useMcpIntegrationsControllerDisable,
  getMcpIntegrationsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegration } from '../model/types';
import extractErrorData from '@/shared/api/extract-error-data';

export function useToggleIntegration() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-integrations');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const enableMutation = useMcpIntegrationsControllerEnable({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getMcpIntegrationsControllerListQueryKey(),
        });
        showSuccess(t('integrations.toggleIntegration.enableSuccess'));
      },
      onError: (error: unknown, variables) => {
        console.error('Enable integration failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'MCP_INTEGRATION_NOT_FOUND':
              showError(t('integrations.toggleIntegration.notFound'));
              break;
            default:
              showError(t('integrations.toggleIntegration.enableError'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('integrations.toggleIntegration.enableError'));
        }
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(variables.id);
          return next;
        });
      },
      onSettled: (_, __, variables) => {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(variables.id);
          return next;
        });
      },
    },
  });

  const disableMutation = useMcpIntegrationsControllerDisable({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: ['useMcpIntegrationsControllerList'],
        });
        showSuccess(t('integrations.toggleIntegration.disableSuccess'));
      },
      onError: (error: unknown, variables) => {
        console.error('Disable integration failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'MCP_INTEGRATION_NOT_FOUND':
              showError(t('integrations.toggleIntegration.notFound'));
              break;
            default:
              showError(t('integrations.toggleIntegration.disableError'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('integrations.toggleIntegration.disableError'));
        }
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(variables.id);
          return next;
        });
      },
      onSettled: (_, __, variables) => {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(variables.id);
          return next;
        });
      },
    },
  });

  function toggleIntegration(integration: McpIntegration, enabled: boolean) {
    setTogglingIds((prev) => new Set(prev).add(integration.id));
    if (enabled) {
      enableMutation.mutate({ id: integration.id });
    } else {
      disableMutation.mutate({ id: integration.id });
    }
  }

  return {
    toggleIntegration,
    togglingIds,
  };
}
