import { createFileRoute } from '@tanstack/react-router';
import { KnowledgeBasesPage } from '@/pages/knowledge-bases';
import {
  knowledgeBasesControllerFindAll,
  getKnowledgeBasesControllerFindAllQueryKey,
  teamsControllerListMyTeams,
  getTeamsControllerListMyTeamsQueryKey,
  myPermissionsControllerGetMine,
  getMyPermissionsControllerGetMineQueryKey,
} from '@ayunis/api-client/endpoints';
import { personalKnowledgeBaseListParams } from '@/shared/api/knowledge-base-scopes';
import { loadChatStarterDefaults } from './-chat-starter-defaults-query';

export const Route = createFileRoute('/_authenticated/knowledge-bases/')({
  component: RouteComponent,
  loader: async ({ context: { queryClient } }) => {
    // Teams and permissions decide which team and organization knowledge bases
    // the cards may switch or delete, so they are loaded before the first paint.
    const [knowledgeBases, chatStarter] = await Promise.all([
      queryClient.query({
        queryKey: getKnowledgeBasesControllerFindAllQueryKey(
          personalKnowledgeBaseListParams,
        ),
        queryFn: () =>
          knowledgeBasesControllerFindAll(personalKnowledgeBaseListParams),
      }),
      loadChatStarterDefaults(queryClient),
      queryClient.query({
        queryKey: getTeamsControllerListMyTeamsQueryKey(),
        queryFn: () => teamsControllerListMyTeams(),
      }),
      queryClient.query({
        queryKey: getMyPermissionsControllerGetMineQueryKey(),
        queryFn: () => myPermissionsControllerGetMine(),
      }),
    ]);
    return { knowledgeBases, chatStarter };
  },
});

function RouteComponent() {
  const { knowledgeBases, chatStarter } = Route.useLoaderData();
  return (
    <KnowledgeBasesPage
      knowledgeBases={knowledgeBases.data}
      chatStarter={chatStarter}
    />
  );
}
