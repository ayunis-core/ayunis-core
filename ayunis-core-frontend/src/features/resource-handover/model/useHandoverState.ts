import { usePendingHandover } from '@/features/resource-handover/api/useHandoverQueries';
import type {
  HandoverKind,
  PendingHandover,
} from '@/features/resource-handover/model/types';

export interface HandoverState {
  pending: PendingHandover | null;
  isReviewing: boolean;
  mayHandOver: boolean;
}

export function useHandoverState(
  kind: HandoverKind,
  item: { id: string; ownerType: string; viewer?: { canUse: boolean } },
): HandoverState {
  const isPersonal = item.ownerType === 'personal';
  const isSomeoneElses = isPersonal && item.viewer?.canUse === false;
  const { pending, isLoading } = usePendingHandover(kind, item.id, isPersonal);
  return {
    pending,
    isReviewing:
      isSomeoneElses || (pending !== null && !pending.viewerIsRequester),
    mayHandOver: isPersonal && !isSomeoneElses && !isLoading && !pending,
  };
}
