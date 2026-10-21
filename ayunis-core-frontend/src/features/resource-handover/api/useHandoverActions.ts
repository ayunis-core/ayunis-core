import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getHandoverRequestsControllerListQueryKey,
  handoverRequestsControllerApprove,
  handoverRequestsControllerCreate,
  handoverRequestsControllerReject,
  handoverRequestsControllerWithdraw,
} from '@/shared/api/generated/ayunisCoreAPI';
import { showError, showSuccess } from '@/shared/lib/toast';
import { handoverErrorKey } from '@/features/resource-handover/api/handover-errors';
import { useRefreshHandoverViews } from '@/features/resource-handover/api/useRefreshHandoverViews';
import { targetCopy } from '@/features/resource-handover/lib/handover-copy';
import { useHandoverCopy } from '@/features/resource-handover/model/useHandoverCopy';
import type {
  HandoverItem,
  HandoverKind,
  HandoverRequest,
  HandoverTarget,
} from '@/features/resource-handover/model/types';

function useFailureToast(kind: HandoverKind) {
  const { text } = useHandoverCopy(kind);
  const refresh = useRefreshHandoverViews();
  return (error: unknown, resourceId: string) => {
    showError(text({ key: handoverErrorKey(error) }));
    void refresh(kind, resourceId);
  };
}

export function useCreateHandover(kind: HandoverKind, item: HandoverItem) {
  const { text } = useHandoverCopy(kind);
  const refresh = useRefreshHandoverViews();
  const failed = useFailureToast(kind);

  return useMutation({
    mutationFn: (target: HandoverTarget) =>
      handoverRequestsControllerCreate({
        resourceType: kind,
        resourceId: item.id,
        targetType: target.type,
        targetTeamId: target.teamId,
      }),
    onSuccess: async (request, target) => {
      showSuccess(
        request.status === 'approved'
          ? text(
              { key: 'toast.direct' },
              { name: item.name, owner: text(targetCopy('owner', target)) },
            )
          : text({ key: 'toast.requested' }),
      );
      await refresh(kind, item.id);
    },
    onError: (error) => failed(error, item.id),
  });
}

export function useWithdrawHandover(kind: HandoverKind, resourceId: string) {
  const { text } = useHandoverCopy(kind);
  const refresh = useRefreshHandoverViews();
  const failed = useFailureToast(kind);

  return useMutation({
    mutationFn: (requestId: string) =>
      handoverRequestsControllerWithdraw(requestId),
    onSuccess: async () => {
      showSuccess(text({ key: 'toast.withdrawn' }));
      await refresh(kind, resourceId);
    },
    onError: (error) => failed(error, resourceId),
  });
}

export type HandoverDecision = 'approve' | 'reject';

interface DecideVariables {
  request: Pick<HandoverRequest, 'id' | 'resource' | 'target' | 'requestedBy'>;
  decision: HandoverDecision;
}

export function useDecideHandover(
  kind: HandoverKind,
  onDecided?: () => Promise<void> | void,
) {
  const { text } = useHandoverCopy(kind);
  const refresh = useRefreshHandoverViews();
  const failed = useFailureToast(kind);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ request, decision }: DecideVariables) =>
      decision === 'approve'
        ? handoverRequestsControllerApprove(request.id)
        : handoverRequestsControllerReject(request.id),
    onSuccess: async (_result, { request, decision }) => {
      showSuccess(
        decision === 'approve'
          ? text(
              { key: 'toast.approved' },
              {
                name: request.resource.name,
                owner: text(targetCopy('owner', request.target)),
              },
            )
          : text(
              { key: 'toast.rejected' },
              {
                name: request.resource.name,
                requester: request.requestedBy.name,
              },
            ),
      );
      queryClient.setQueryData<HandoverRequest[]>(
        getHandoverRequestsControllerListQueryKey({ resourceType: kind }),
        (requests) => requests?.filter(({ id }) => id !== request.id),
      );
      await onDecided?.();
      await refresh(kind, request.resource.id);
    },
    onError: (error, { request }) => failed(error, request.resource.id),
  });
}
