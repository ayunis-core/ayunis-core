import { createFileRoute } from '@tanstack/react-router';
import { KnowledgeBasesPage } from '@/pages/knowledge-bases';
import {
  knowledgeBasesControllerFindAll,
  getKnowledgeBasesControllerFindAllQueryKey,
  teamsControllerListMyTeams,
  getTeamsControllerListMyTeamsQueryKey,
  myPermissionsControllerGetMine,
  getMyPermissionsControllerGetMineQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { personalKnowledgeBaseListParams } from '@/shared/api/knowledge-base-scopes';

export const Route = createFileRoute('/_authenticated/knowledge-bases/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    // Teams and permissions decide which team and organization knowledge bases
    // the cards may switch or delete, so they are loaded before the first paint.
    const [knowledgeBases] = await Promise.all([
      queryClient.query({
        queryKey: getKnowledgeBasesControllerFindAllQueryKey(
          personalKnowledgeBaseListParams,
        ),
        queryFn: () =>
          knowledgeBasesControllerFindAll(personalKnowledgeBaseListParams),
      }),
      queryClient.query({
        queryKey: getTeamsControllerListMyTeamsQueryKey(),
        queryFn: () => teamsControllerListMyTeams(),
      }),
      queryClient.query({
        queryKey: getMyPermissionsControllerGetMineQueryKey(),
        queryFn: () => myPermissionsControllerGetMine(),
      }),
    ]);
    return { knowledgeBases };
  },
});

function RouteComponent() {
  const { knowledgeBases } = Route.useLoaderData();
  return <KnowledgeBasesPage knowledgeBases={knowledgeBases.data} />;
}
