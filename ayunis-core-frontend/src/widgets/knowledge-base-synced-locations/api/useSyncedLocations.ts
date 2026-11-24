import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getKnowledgeBasesControllerFindOneQueryKey,
  getKnowledgeBasesControllerListDocumentsQueryKey,
  useKnowledgeBaseSyncedLocationsControllerList,
} from '@ayunis/api-client/endpoints';
import type { SyncedLocationResponseDto } from '@ayunis/api-client/schemas';
import {
  syncedDocumentsSignature,
  syncedLocationsPollInterval,
} from '@/widgets/knowledge-base-synced-locations/lib/synced-locations-poll';

export function useSyncedLocations(
  knowledgeBaseId: string,
  {
    enabled,
    syncRequestedAt,
  }: { enabled: boolean; syncRequestedAt: number | null },
) {
  const { data, isLoading, isError, refetch } =
    useKnowledgeBaseSyncedLocationsControllerList(knowledgeBaseId, {
      query: {
        enabled,
        refetchInterval: (query) =>
          syncedLocationsPollInterval(
            query.state.data?.data ?? [],
            syncRequestedAt,
            Date.now(),
          ),
      },
    });
  useRefreshDocumentsOnSync(knowledgeBaseId, data?.data);
  return {
    locations: data?.data ?? [],
    availableProducts: data?.availableProducts ?? [],
    isLoading,
    // A failed poll keeps showing the locations it had.
    loadFailed: isError && !data,
    refetch,
  };
}

/**
 * The documents list polls only while documents are processing, so documents
 * a sync adds in the background would show only after a reload.
 */
function useRefreshDocumentsOnSync(
  knowledgeBaseId: string,
  locations: SyncedLocationResponseDto[] | undefined,
) {
  const queryClient = useQueryClient();
  const signature = locations && syncedDocumentsSignature(locations);
  const previous = useRef(signature);
  useEffect(() => {
    if (signature === undefined) return;
    if (previous.current !== undefined && previous.current !== signature) {
      void queryClient.invalidateQueries({
        queryKey:
          getKnowledgeBasesControllerListDocumentsQueryKey(knowledgeBaseId),
      });
      void queryClient.invalidateQueries({
        queryKey: getKnowledgeBasesControllerFindOneQueryKey(knowledgeBaseId),
      });
    }
    previous.current = signature;
  }, [knowledgeBaseId, queryClient, signature]);
}
