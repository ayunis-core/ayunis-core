import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getMcpToolAllowancesControllerListQueryKey,
  mcpToolAllowancesControllerRemove,
} from '@/shared/api';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useRemoveMcpToolAllowance() {
  const { t } = useTranslation('settings');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mcpToolAllowancesControllerRemove(id),
    onSuccess: () => {
      showSuccess(t('integrations.alwaysAllowed.removeSuccess'));
    },
    onError: (error) => {
      try {
        const { code } = extractErrorData(error);
        if (code === 'MCP_TOOL_ALLOWANCE_NOT_FOUND') {
          showError(t('integrations.alwaysAllowed.notFound'));
          return;
        }
        showError(t('integrations.alwaysAllowed.removeError'));
      } catch {
        showError(t('integrations.alwaysAllowed.removeError'));
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: getMcpToolAllowancesControllerListQueryKey(),
      });
    },
  });
}
