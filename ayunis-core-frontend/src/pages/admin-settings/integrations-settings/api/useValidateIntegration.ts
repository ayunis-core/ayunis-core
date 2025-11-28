import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useMcpIntegrationsControllerValidate } from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegration } from '../model/types';

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
          t('integrations.validateIntegration.error', {
            message: errorMessage,
          }),
        );
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
