import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  workspaceContextControllerFindSkill,
  workspaceContextControllerListKnowledgeBases,
  workspacesControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';
import { WorkspaceSkillDetailPage } from '@/pages/workspace/ui/WorkspaceSkillDetailPage';

export const Route = createFileRoute(
  '/_authenticated/workspaces_/$workspaceId/skills/$skillId',
)({
  component: RouteComponent,
  loader: async ({ params: { workspaceId, skillId } }) => {
    try {
      const [workspace, skill, knowledgeBases] = await Promise.all([
        workspacesControllerFindOne(workspaceId),
        workspaceContextControllerFindSkill(workspaceId, skillId),
        workspaceContextControllerListKnowledgeBases(workspaceId, {
          limit: 100,
          offset: 0,
        }),
      ]);
      return { workspace, skill, knowledgeBases: knowledgeBases.data };
    } catch {
      throw redirect({
        to: '/workspaces/$workspaceId',
        params: { workspaceId },
      });
    }
  },
});

function RouteComponent() {
  return <WorkspaceSkillDetailPage {...Route.useLoaderData()} />;
}
