import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getKnowledgeBasesControllerFindOneQueryKey,
  getKnowledgeBasesControllerListDocumentsQueryKey,
  getKnowledgeBaseSyncedLocationsControllerListQueryKey,
  useKnowledgeBaseSyncedLocationsControllerRemove,
} from '@/shared/api/generated/ayunisCoreAPI';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

export function useRemoveSyncedLocation(knowledgeBaseId: string) {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();
  const mutation = useKnowledgeBaseSyncedLocationsControllerRemove({
    mutation: {
      onSuccess: async () => {
        showSuccess(t('detail.syncedLocations.removeSuccess'));
        // The location's documents are gone with it; refreshed first, they
        // never show as loose documents of a location no longer listed.
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey:
              getKnowledgeBasesControllerListDocumentsQueryKey(knowledgeBaseId),
          }),
          queryClient.invalidateQueries({
            queryKey:
              getKnowledgeBasesControllerFindOneQueryKey(knowledgeBaseId),
          }),
        ]);
        await queryClient.invalidateQueries({
          queryKey:
            getKnowledgeBaseSyncedLocationsControllerListQueryKey(
              knowledgeBaseId,
            ),
        });
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          showError(
            t(
              code === 'SYNCED_LOCATION_NOT_FOUND'
                ? 'detail.syncedLocations.errors.notFound'
                : 'detail.syncedLocations.errors.remove',
            ),
          );
        } catch {
          showError(t('detail.syncedLocations.errors.remove'));
        }
      },
    },
  });

  return {
    removeLocation: (locationId: string) =>
      mutation.mutate({ id: knowledgeBaseId, locationId }),
    isRemoving: mutation.isPending,
  };
}
