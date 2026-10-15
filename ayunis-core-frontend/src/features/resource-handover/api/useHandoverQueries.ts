import {
  useHandoverRequestsControllerList,
  useHandoverRequestsControllerPending,
  useHandoverRequestsControllerSummary,
  useHandoverRequestsControllerTargets,
} from '@/shared/api/generated/ayunisCoreAPI';
import type {
  HandoverKind,
  HandoverRequest,
  HandoverTarget,
  PendingHandover,
} from '@/features/resource-handover/model/types';

export interface HandoverTargetsState {
  targets: HandoverTarget[];
  orgEditorsIncludeNonAdmins: boolean;
  isLoading: boolean;
}

export function useHandoverTargets(
  kind: HandoverKind,
  enabled: boolean,
): HandoverTargetsState {
  const { data, isLoading } = useHandoverRequestsControllerTargets(
    { resourceType: kind },
    { query: { enabled } },
  );
  return {
    targets: data?.targets ?? [],
    orgEditorsIncludeNonAdmins: data?.orgEditorsIncludeNonAdmins ?? false,
    isLoading,
  };
}

export function usePendingHandover(
  kind: HandoverKind,
  resourceId: string,
  enabled: boolean,
): { pending: PendingHandover | null; isLoading: boolean } {
  const { data, isLoading } = useHandoverRequestsControllerPending(
    { resourceType: kind, resourceId },
    { query: { enabled } },
  );
  return {
    pending: enabled ? (data?.pending ?? null) : null,
    isLoading: enabled && isLoading,
  };
}

export function useReviewableHandovers(
  kind: HandoverKind,
  enabled: boolean,
): { requests: HandoverRequest[]; isLoading: boolean } {
  const { data, isLoading } = useHandoverRequestsControllerList(
    { resourceType: kind },
    { query: { enabled } },
  );
  return { requests: data ?? [], isLoading };
}

export interface HandoverReviewSummary {
  canReview: boolean;
  openRequests: number;
  isLoading: boolean;
}

export function useHandoverSummary(): Record<
  HandoverKind,
  HandoverReviewSummary
> {
  const { data, isLoading } = useHandoverRequestsControllerSummary({
    query: { staleTime: 0, refetchOnWindowFocus: true },
  });
  return {
    skill: {
      canReview: data?.canReviewSkills ?? false,
      openRequests: data?.openSkillRequests ?? 0,
      isLoading,
    },
    knowledge_base: {
      canReview: data?.canReviewKnowledgeBases ?? false,
      openRequests: data?.openKnowledgeBaseRequests ?? 0,
      isLoading,
    },
  };
}
