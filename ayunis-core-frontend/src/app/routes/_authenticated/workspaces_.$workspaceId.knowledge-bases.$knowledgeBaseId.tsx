import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  workspaceContextControllerFindKnowledgeBase,
  workspaceContextControllerListKnowledgeBaseDocuments,
  workspacesControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';
import { WorkspaceKnowledgeBaseDetailPage } from '@/pages/workspace/ui/WorkspaceKnowledgeBaseDetailPage';

export const Route = createFileRoute(
  '/_authenticated/workspaces_/$workspaceId/knowledge-bases/$knowledgeBaseId',
)({
  component: RouteComponent,
  loader: async ({ params: { workspaceId, knowledgeBaseId } }) => {
    try {
      const [workspace, knowledgeBase, documents] = await Promise.all([
        workspacesControllerFindOne(workspaceId),
        workspaceContextControllerFindKnowledgeBase(
          workspaceId,
          knowledgeBaseId,
        ),
        workspaceContextControllerListKnowledgeBaseDocuments(
          workspaceId,
          knowledgeBaseId,
        ),
      ]);
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
