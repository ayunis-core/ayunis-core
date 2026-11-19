import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getKnowledgeBaseSyncedLocationsControllerListQueryKey,
  useKnowledgeBaseSyncedLocationsControllerSyncNow,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useSyncLocationNow(
  knowledgeBaseId: string,
  onRequested: () => void,
) {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();
  const mutation = useKnowledgeBaseSyncedLocationsControllerSyncNow({
    mutation: {
      onSuccess: () => {
        onRequested();
        void queryClient.invalidateQueries({
          queryKey:
            getKnowledgeBaseSyncedLocationsControllerListQueryKey(
              knowledgeBaseId,
            ),
        });
        showSuccess(t('detail.syncedLocations.syncNowSuccess'));
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          showError(
            t(
              code === 'SYNCED_LOCATION_NOT_FOUND'
                ? 'detail.syncedLocations.errors.notFound'
                : 'detail.syncedLocations.errors.syncNow',
            ),
          );
        } catch {
          showError(t('detail.syncedLocations.errors.syncNow'));
        }
      },
    },
  });

  return {
    syncNow: (locationId: string) =>
      mutation.mutate({ id: knowledgeBaseId, locationId }),
    isRequestingSync: mutation.isPending,
  };
}
