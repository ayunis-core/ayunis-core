import {
  useThreadMcpIntegrationsControllerAddMcpIntegration,
  useThreadMcpIntegrationsControllerRemoveMcpIntegration,
  getThreadsControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { useQueryClient } from '@tanstack/react-query';
import { showError } from '@/shared/lib/toast';
import { useTranslation } from 'react-i18next';
import extractErrorData from '@/shared/api/extract-error-data';

interface UseMcpIntegrationAttachmentProps {
  threadId: string;
}

export function useMcpIntegrationAttachment({
  threadId,
}: UseMcpIntegrationAttachmentProps) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('chat');

  const handleError = (error: unknown, fallbackMessage: string) => {
    try {
      const { code } = extractErrorData(error);
      if (code === 'MCP_INTEGRATION_NOT_FOUND') {
        showError(t('chat.errorIntegrationNotFound'));
      } else {
        showError(fallbackMessage);
      }
    } catch {
      showError(fallbackMessage);
    }
  };

  const addMutation = useThreadMcpIntegrationsControllerAddMcpIntegration({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getThreadsControllerFindOneQueryKey(threadId),
        });
      },
      onError: (error) => {
        handleError(error, t('chat.errorAddIntegration'));
      },
    },
  });

  const removeMutation = useThreadMcpIntegrationsControllerRemoveMcpIntegration(
    {
      mutation: {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: getThreadsControllerFindOneQueryKey(threadId),
          });
        },
        onError: (error) => {
          handleError(error, t('chat.errorRemoveIntegration'));
        },
      },
    },
  );

  const addIntegration = (mcpIntegrationId: string) => {
    addMutation.mutate({ id: threadId, mcpIntegrationId });
  };

  const removeIntegration = (mcpIntegrationId: string) => {
    removeMutation.mutate({ id: threadId, mcpIntegrationId });
  };

  return {
    addIntegration,
    removeIntegration,
  };
}
