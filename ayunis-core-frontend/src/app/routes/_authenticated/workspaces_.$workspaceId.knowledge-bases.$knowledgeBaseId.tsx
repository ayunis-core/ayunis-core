import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  getKnowledgeBasesControllerFindOneQueryKey,
  getKnowledgeBasesControllerListDocumentsQueryKey,
  getWorkspacesControllerFindOneQueryKey,
  knowledgeBasesControllerFindOne,
  knowledgeBasesControllerListDocuments,
  workspacesControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';
import { WorkspaceKnowledgeBaseDetailPage } from '@/pages/workspace/ui/WorkspaceKnowledgeBaseDetailPage';

export const Route = createFileRoute(
  '/_authenticated/workspaces_/$workspaceId/knowledge-bases/$knowledgeBaseId',
)({
  component: RouteComponent,
  loader: async ({
    context: { queryClient },
    params: { workspaceId, knowledgeBaseId },
  }) => {
    try {
      const [workspace, knowledgeBase] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: getWorkspacesControllerFindOneQueryKey(workspaceId),
          queryFn: () => workspacesControllerFindOne(workspaceId),
        }),
        queryClient.fetchQuery({
          queryKey: getKnowledgeBasesControllerFindOneQueryKey(knowledgeBaseId),
          queryFn: () => knowledgeBasesControllerFindOne(knowledgeBaseId),
        }),
      ]);
      if (
        knowledgeBase.ownerType !== 'workspace' ||
        knowledgeBase.workspaceId !== workspaceId
      ) {
        throw new Error('Knowledge base is outside the route workspace scope');
      }
      const documents = await queryClient.fetchQuery({
        queryKey:
          getKnowledgeBasesControllerListDocumentsQueryKey(knowledgeBaseId),
        queryFn: () => knowledgeBasesControllerListDocuments(knowledgeBaseId),
      });
      return { workspace, knowledgeBase, documents };
    } catch {
      throw redirect({
        to: '/workspaces/$workspaceId',
        params: { workspaceId },
      });
    }
  },
});

function RouteComponent() {
  return <WorkspaceKnowledgeBaseDetailPage {...Route.useLoaderData()} />;
}
