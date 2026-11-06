import { queryOptions } from '@tanstack/react-query';
import {
  knowledgeBasesControllerFindOne,
  getKnowledgeBasesControllerFindOneQueryKey,
  sharesControllerGetShares,
  getSharesControllerGetSharesQueryKey,
  teamsControllerListMyTeams,
  getTeamsControllerListMyTeamsQueryKey,
  myPermissionsControllerGetMine,
  getMyPermissionsControllerGetMineQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { CreateKnowledgeBaseShareDtoEntityType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { KnowledgeBasePage } from '@/pages/knowledge-base';
import { z } from 'zod';

const searchSchema = z.object({
  tab: z.enum(['config', 'share']).optional(),
});

const knowledgeBaseQueryOptions = (id: string) =>
  queryOptions({
    queryKey: getKnowledgeBasesControllerFindOneQueryKey(id),
    queryFn: () => knowledgeBasesControllerFindOne(id),
  });

const sharesQueryOptions = (knowledgeBaseId: string) =>
  queryOptions({
    queryKey: getSharesControllerGetSharesQueryKey({
      entityId: knowledgeBaseId,
      entityType: CreateKnowledgeBaseShareDtoEntityType.knowledge_base,
    }),
    queryFn: () =>
      sharesControllerGetShares({
        entityId: knowledgeBaseId,
        entityType: CreateKnowledgeBaseShareDtoEntityType.knowledge_base,
      }),
  });

const userTeamsQueryOptions = () =>
  queryOptions({
    queryKey: getTeamsControllerListMyTeamsQueryKey(),
    queryFn: () => teamsControllerListMyTeams(),
  });

const myPermissionsQueryOptions = () =>
  queryOptions({
    queryKey: getMyPermissionsControllerGetMineQueryKey(),
    queryFn: () => myPermissionsControllerGetMine(),
  });

export const Route = createFileRoute('/_authenticated/knowledge-bases/$id')({
  component: RouteComponent,
  validateSearch: searchSchema,
  loader: async ({ context: { queryClient }, params: { id } }) => {
    const knowledgeBase = await queryClient.query(
      knowledgeBaseQueryOptions(id),
    );
    if (knowledgeBase.ownerType === 'workspace') {
      if (!knowledgeBase.workspaceId)
        throw redirect({ to: '/knowledge-bases' });
      throw redirect({
        to: '/workspaces/$workspaceId/knowledge-bases/$knowledgeBaseId',
        params: {
          workspaceId: knowledgeBase.workspaceId,
          knowledgeBaseId: knowledgeBase.id,
        },
      });
    }
    // Only the owner of a personal knowledge base manages its shares; team and
    // organization knowledge bases cannot be shared.
    const canShare =
      knowledgeBase.ownerType === 'personal' && !knowledgeBase.isShared;
    // Teams and permissions decide who may manage team and organization
    // items, so they are loaded before the first paint for every owner.
    const [shares, userTeams] = await Promise.all([
      canShare ? queryClient.query(sharesQueryOptions(id)) : [],
      queryClient.query(userTeamsQueryOptions()),
      queryClient.query(myPermissionsQueryOptions()),
    ]);
    return { knowledgeBase, shares, userTeams };
  },
});

function RouteComponent() {
  const { knowledgeBase, shares, userTeams } = Route.useLoaderData();
  const { tab } = Route.useSearch();
  return (
    <KnowledgeBasePage
      knowledgeBase={knowledgeBase}
      shares={shares}
      userTeams={userTeams}
      initialTab={tab}
    />
  );
}
