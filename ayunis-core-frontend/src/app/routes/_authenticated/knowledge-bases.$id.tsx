import { queryOptions } from '@tanstack/react-query';
import {
  knowledgeBasesControllerFindOne,
  getKnowledgeBasesControllerFindOneQueryKey,
  appControllerFeatureToggles,
  getAppControllerFeatureTogglesQueryKey,
  sharesControllerGetShares,
  getSharesControllerGetSharesQueryKey,
  teamsControllerListMyTeams,
  getTeamsControllerListMyTeamsQueryKey,
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

export const Route = createFileRoute('/_authenticated/knowledge-bases/$id')({
  component: RouteComponent,
  validateSearch: searchSchema,
  loader: async ({ context: { queryClient }, params: { id } }) => {
    const featureToggles = await queryClient.fetchQuery({
      queryKey: getAppControllerFeatureTogglesQueryKey(),
      queryFn: () => appControllerFeatureToggles(),
    });
    if (!featureToggles.knowledgeBasesEnabled) {
      throw redirect({ to: '/chat' });
    }
    const knowledgeBase = await queryClient.fetchQuery(
      knowledgeBaseQueryOptions(id),
    );
    // Only query shares and user teams if the user owns the KB (not shared)
    const shares = knowledgeBase.isShared
      ? []
      : await queryClient.fetchQuery(sharesQueryOptions(id));
    const userTeams = knowledgeBase.isShared
      ? []
      : await queryClient.fetchQuery(userTeamsQueryOptions());
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
