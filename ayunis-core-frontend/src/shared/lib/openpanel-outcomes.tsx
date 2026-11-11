import { createContext, useCallback, useContext } from 'react';
import type { ReactNode } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getThreadsControllerFindOneQueryKey } from '@/shared/api/generated/ayunisCoreAPI';
import type { GetThreadResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  threadInteractionContext,
  trackOpenPanelEvent,
  type InteractionContext,
} from '@/shared/lib/openpanel-events';

type ProductiveOutcomeProperties = Parameters<
  typeof trackOpenPanelEvent<'productive_outcome'>
>[1];

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export type ProductiveOutcome = DistributiveOmit<
  ProductiveOutcomeProperties,
  keyof InteractionContext
>;

type TrackProductiveOutcome = (outcome: ProductiveOutcome) => void;

/**
 * Sends a productive outcome with the interaction context the chat's thread
 * query holds at that moment.
 */
// eslint-disable-next-line react-refresh/only-export-components -- for the chat page's hooks, which run above the provider
export function trackProductiveOutcome(
  queryClient: QueryClient,
  threadId: string,
  outcome: ProductiveOutcome,
): void {
  const thread = queryClient.getQueryData<GetThreadResponseDto>(
    getThreadsControllerFindOneQueryKey(threadId),
  );
  trackOpenPanelEvent('productive_outcome', {
    ...threadInteractionContext(thread),
    ...outcome,
  });
}

const ignoreOutcome: TrackProductiveOutcome = () => undefined;

const ProductiveOutcomeContext =
  createContext<TrackProductiveOutcome>(ignoreOutcome);

interface ProductiveOutcomeProviderProps {
  readonly threadId: string;
  readonly children: ReactNode;
}

/**
 * Marks its children as part of a chat. Outcomes such as copies and downloads
 * are only tracked inside a chat; elsewhere they send nothing.
 */
export function ProductiveOutcomeProvider({
  threadId,
  children,
}: ProductiveOutcomeProviderProps) {
  const queryClient = useQueryClient();
  const track = useCallback<TrackProductiveOutcome>(
    (outcome) => trackProductiveOutcome(queryClient, threadId, outcome),
    [queryClient, threadId],
  );
  return (
    <ProductiveOutcomeContext.Provider value={track}>
      {children}
    </ProductiveOutcomeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook belongs with its provider by repo convention
export function useTrackProductiveOutcome(): TrackProductiveOutcome {
  return useContext(ProductiveOutcomeContext);
}
