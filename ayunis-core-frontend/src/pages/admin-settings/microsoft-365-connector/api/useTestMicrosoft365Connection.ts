import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useConnectorsControllerTestMicrosoft365,
  getConnectorsControllerGetMicrosoft365QueryKey,
} from '@ayunis/api-client/endpoints';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';
import type { ShowConnectionTest } from '@/pages/admin-settings/microsoft-365-connector/lib/useLatestConnectionTest';

export function useTestMicrosoft365Connection(
  startRequest: () => ShowConnectionTest,
) {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-connections');

  const mutation = useConnectorsControllerTestMicrosoft365({
    mutation: {
      onMutate: startRequest,
      onSuccess: (result, _variables, showConnectionTest) =>
        showConnectionTest(result),
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          if (code === 'CONNECTOR_NOT_SET_UP') {
            showError(t('microsoft365.test.notSetUp'));
            void queryClient.invalidateQueries({
              queryKey: getConnectorsControllerGetMicrosoft365QueryKey(),
            });
          } else {
            showError(t('microsoft365.test.error'));
          }
        } catch {
          showError(t('microsoft365.test.error'));
        }
      },
    },
  });

  return {
    testConnection: () => mutation.mutate(),
    isTesting: mutation.isPending,
  };
}
