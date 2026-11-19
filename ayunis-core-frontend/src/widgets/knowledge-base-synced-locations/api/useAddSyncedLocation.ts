import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getKnowledgeBaseSyncedLocationsControllerListQueryKey,
  useKnowledgeBaseSyncedLocationsControllerAdd,
} from '@/shared/api/generated/ayunisCoreAPI';
import { ConnectorProduct } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError, showSuccess } from '@/shared/lib/toast';

const ADD_ERROR_KEYS: Partial<Record<string, string>> = {
  SYNCED_LOCATION_ALREADY_EXISTS: 'detail.syncedLocations.errors.alreadyExists',
  CONNECTOR_NOT_SET_UP: 'detail.syncedLocations.errors.notSetUp',
  KNOWLEDGE_BASE_NOT_FOUND: 'delete.notFound',
};

export function useAddSyncedLocation(
  knowledgeBaseId: string,
  onAdded: () => void,
) {
  const { t } = useTranslation('knowledge-bases');
  const queryClient = useQueryClient();
  const mutation = useKnowledgeBaseSyncedLocationsControllerAdd({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey:
            getKnowledgeBaseSyncedLocationsControllerListQueryKey(
              knowledgeBaseId,
            ),
        });
        showSuccess(t('detail.syncedLocations.addSuccess'));
        onAdded();
      },
      onError: (error: unknown) => {
        try {
          const { code } = extractErrorData(error);
          showError(
            t(
              (code && ADD_ERROR_KEYS[code]) ??
                'detail.syncedLocations.errors.add',
            ),
          );
        } catch {
          showError(t('detail.syncedLocations.errors.add'));
        }
      },
    },
  });

  return {
    addSharePointLocation: (location: string) =>
      mutation.mutate({
        id: knowledgeBaseId,
        data: { product: ConnectorProduct.microsoft_365, location },
      }),
    isAdding: mutation.isPending,
  };
}
