import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  useConnectorsControllerRemoveMicrosoft365,
  getConnectorsControllerGetMicrosoft365QueryKey,
  getConnectorsControllerListQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useRemoveMicrosoft365Connector() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('admin-settings-connections');

  return useConnectorsControllerRemoveMicrosoft365({
    mutation: {
      onSuccess: () => {
        showSuccess(t('microsoft365.remove.success'));
      },
      onError: () => {
        showError(t('microsoft365.remove.error'));
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: getConnectorsControllerGetMicrosoft365QueryKey(),
        });
        void queryClient.invalidateQueries({
          queryKey: getConnectorsControllerListQueryKey(),
        });
      },
    },
  });
}
