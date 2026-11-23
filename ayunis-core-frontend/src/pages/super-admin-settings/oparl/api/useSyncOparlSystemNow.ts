import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getSuperAdminOparlSystemsControllerListQueryKey,
  useSuperAdminOparlSystemsControllerSync,
} from '@ayunis/api-client';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useSyncOparlSystemNow() {
  const { t } = useTranslation('super-admin-settings-oparl');
  const queryClient = useQueryClient();

  const { mutate, isPending } = useSuperAdminOparlSystemsControllerSync({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: getSuperAdminOparlSystemsControllerListQueryKey(),
        });
        showSuccess(t('sync.success'));
      },
      onError: () => {
        showError(t('sync.error'));
      },
    },
  });

  function syncNow(systemId: string) {
    mutate({ id: systemId });
  }

  return { syncNow, isPending };
}
