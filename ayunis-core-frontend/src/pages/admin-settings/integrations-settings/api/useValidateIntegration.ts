import { useState } from 'react';
import { showSuccess, showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import { useMcpIntegrationsControllerValidate } from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegration } from '../model/types';
import extractErrorData from '@/shared/api/extract-error-data';

export function useValidateIntegration() {
  const { t } = useTranslation('admin-settings-integrations');
  const [validatingIds, setValidatingIds] = useState<Set<string>>(new Set());

  const mutation = useMcpIntegrationsControllerValidate({
    mutation: {
      onSuccess: (data) => {
        if (!data.valid) {
          showError(
            t('integrations.validateIntegration.error', {
              message: data.error,
            }),
          );
          return;
        }
        const capabilities = (data.capabilities || {
          prompts: 0,
          resources: 0,
          tools: 0,
        }) as {
          prompts: number;
          resources: number;
          tools: number;
        };
        showSuccess(
          t('integrations.validateIntegration.success', {
            prompts: capabilities.prompts,
            resources: capabilities.resources,
            tools: capabilities.tools,
          }),
        );
      },
      onError: (error: unknown, variables) => {
        console.error('Validate integration failed:', error);
        try {
          const { code } = extractErrorData(error);
          switch (code) {
            case 'MCP_CONNECTION_TIMEOUT':
              showError(
                t('integrations.validateIntegration.connectionTimeout'),
              );
              break;
            case 'MCP_AUTHENTICATION_FAILED':
              showError(
                t('integrations.validateIntegration.authenticationFailed'),
              );
              break;
            case 'MCP_INTEGRATION_NOT_FOUND':
              showError(t('integrations.validateIntegration.notFound'));
              break;
            default:
              showError(t('integrations.validateIntegration.error'));
          }
        } catch {
          // Non-AxiosError (network failure, request cancellation, etc.)
          showError(t('integrations.validateIntegration.error'));
        }
        setValidatingIds((prev) => {
          const next = new Set(prev);
          next.delete(variables.id);
          return next;
        });
      },
      onSettled: (_, __, variables) => {
        setValidatingIds((prev) => {
          const next = new Set(prev);
          next.delete(variables.id);
          return next;
        });
      },
    },
  });

  function validateIntegration(integration: McpIntegration) {
    setValidatingIds((prev) => new Set(prev).add(integration.id));
    mutation.mutate({ id: integration.id });
  }

  return {
    validateIntegration,
    validatingIds,
  };
}
