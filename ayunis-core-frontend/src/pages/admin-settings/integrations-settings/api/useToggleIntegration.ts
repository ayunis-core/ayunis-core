import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  useMcpIntegrationsControllerEnable,
  useMcpIntegrationsControllerDisable,
  getMcpIntegrationsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { McpIntegration } from '../model/types';

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
        toast.success(t('integrations.toggleIntegration.enableSuccess'));
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
          t('integrations.toggleIntegration.enableError', {
            message: errorMessage,
          }),
        );
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
        toast.success(t('integrations.toggleIntegration.disableSuccess'));
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
          t('integrations.toggleIntegration.disableError', {
            message: errorMessage,
          }),
        );
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
