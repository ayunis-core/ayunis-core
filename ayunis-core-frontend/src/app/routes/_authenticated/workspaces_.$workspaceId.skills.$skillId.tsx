import { createFileRoute, redirect } from '@tanstack/react-router';
import { WorkspaceSkillDetailPage } from '@/pages/workspace/ui/WorkspaceSkillDetailPage';
import {
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  getSkillsControllerFindOneQueryKey,
  getWorkspacesControllerFindOneQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
  skillsControllerFindOne,
  workspacesControllerFindOne,
} from '@/shared/api/generated/ayunisCoreAPI';

export const Route = createFileRoute(
  '/_authenticated/workspaces_/$workspaceId/skills/$skillId',
)({
  component: RouteComponent,
  loader: async ({
    context: { queryClient },
    params: { workspaceId, skillId },
  }) => {
    try {
      const [workspace, skill, embeddingModel] = await Promise.all([
        queryClient.query({
          queryKey: getWorkspacesControllerFindOneQueryKey(workspaceId),
          queryFn: () => workspacesControllerFindOne(workspaceId),
        }),
        queryClient.query({
          queryKey: getSkillsControllerFindOneQueryKey(skillId),
          queryFn: () => skillsControllerFindOne(skillId),
        }),
        queryClient.query({
          queryKey: getModelsControllerIsEmbeddingModelEnabledQueryKey(),
          queryFn: () => modelsControllerIsEmbeddingModelEnabled(),
        }),
      ]);
      if (
        skill.ownerType !== 'workspace' ||
        skill.workspaceId !== workspaceId
      ) {
        throw new Error('Skill is outside the route workspace scope');
      }
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
