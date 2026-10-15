import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import {
  getHandoverRequestsControllerListQueryKey,
  getHandoverRequestsControllerPendingQueryKey,
  getHandoverRequestsControllerSummaryQueryKey,
  getKnowledgeBasesControllerFindAllQueryKey,
  getKnowledgeBasesControllerFindOneQueryKey,
  getSkillsControllerFindAllQueryKey,
  getSkillsControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalKnowledgeBaseListParams } from '@/shared/api/knowledge-base-scopes';
import { personalSkillListParams } from '@/shared/api/skill-scopes';
import type { HandoverKind } from '@/features/resource-handover/model/types';

function itemQueryKeys(kind: HandoverKind, resourceId: string) {
  return kind === 'skill'
    ? [
        getSkillsControllerFindAllQueryKey(personalSkillListParams),
        getSkillsControllerFindOneQueryKey(resourceId),
      ]
    : [
        getKnowledgeBasesControllerFindAllQueryKey(
          personalKnowledgeBaseListParams,
        ),
        getKnowledgeBasesControllerFindOneQueryKey(resourceId),
      ];
}

export function useRefreshHandoverViews() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return async (kind: HandoverKind, resourceId: string) => {
    const queryKeys = [
      ...itemQueryKeys(kind, resourceId),
      getHandoverRequestsControllerPendingQueryKey({
        resourceType: kind,
        resourceId,
      }),
      getHandoverRequestsControllerListQueryKey({ resourceType: kind }),
      getHandoverRequestsControllerSummaryQueryKey(),
    ];
    await Promise.all(
      queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
    await router.invalidate();
  };
}
