import { useState } from 'react';
import { toast } from 'sonner';
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
          toast.error(
            t('integrations.validateIntegration.error', {
              message: data.error,
            }),
          );
          return;
        }
        const capabilities = data.capabilities || {
          prompts: 0,
          resources: 0,
          tools: 0,
        };
        toast.success(
          t('integrations.validateIntegration.success', {
            prompts: capabilities.prompts,
            resources: capabilities.resources,
            tools: capabilities.tools,
          }),
        );
      },
      onError: (error: unknown, variables) => {
        console.error('Validate integration failed:', error);
        const { code } = extractErrorData(error);
        switch (code) {
          case 'MCP_CONNECTION_TIMEOUT':
            toast.error(t('integrations.validateIntegration.connectionTimeout'));
            break;
          case 'MCP_AUTHENTICATION_FAILED':
            toast.error(t('integrations.validateIntegration.authenticationFailed'));
            break;
          case 'MCP_INTEGRATION_NOT_FOUND':
            toast.error(t('integrations.validateIntegration.notFound'));
            break;
          default:
            toast.error(t('integrations.validateIntegration.error'));
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
