import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  workspaceContextControllerFindSkill,
  workspacesControllerFindOne,
  modelsControllerIsEmbeddingModelEnabled,
} from '@/shared/api/generated/ayunisCoreAPI';
import { WorkspaceSkillDetailPage } from '@/pages/workspace/ui/WorkspaceSkillDetailPage';

export const Route = createFileRoute(
  '/_authenticated/workspaces_/$workspaceId/skills/$skillId',
)({
  component: RouteComponent,
  loader: async ({ params: { workspaceId, skillId } }) => {
    try {
      const [workspace, skill, embeddingModel] = await Promise.all([
        workspacesControllerFindOne(workspaceId),
        workspaceContextControllerFindSkill(workspaceId, skillId),
        modelsControllerIsEmbeddingModelEnabled(),
      ]);
      return {
        workspace,
        skill,
        isEmbeddingModelEnabled: embeddingModel.isEmbeddingModelEnabled,
      };
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
