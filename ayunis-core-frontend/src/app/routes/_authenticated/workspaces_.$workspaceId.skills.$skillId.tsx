import { createFileRoute, redirect } from '@tanstack/react-router';
import { WorkspaceSkillDetailPage } from '@/pages/workspace/ui/WorkspaceSkillDetailPage';
import {
  getModelsControllerIsEmbeddingModelEnabledQueryKey,
  getSkillKnowledgeBasesControllerListSkillKnowledgeBasesQueryKey,
  getSkillsControllerFindOneQueryKey,
  getWorkspacesControllerFindOneQueryKey,
  modelsControllerIsEmbeddingModelEnabled,
  skillKnowledgeBasesControllerListSkillKnowledgeBases,
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
        queryClient.fetchQuery({
          queryKey: getWorkspacesControllerFindOneQueryKey(workspaceId),
          queryFn: () => workspacesControllerFindOne(workspaceId),
        }),
        queryClient.fetchQuery({
          queryKey: getSkillsControllerFindOneQueryKey(skillId),
          queryFn: () => skillsControllerFindOne(skillId),
        }),
        queryClient.fetchQuery({
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
      const assignedKnowledgeBases = await queryClient.fetchQuery({
        queryKey:
          getSkillKnowledgeBasesControllerListSkillKnowledgeBasesQueryKey(
            skillId,
          ),
        queryFn: () =>
          skillKnowledgeBasesControllerListSkillKnowledgeBases(skillId),
      });
      return {
        workspace,
        skill,
        assignedKnowledgeBaseIds: assignedKnowledgeBases.map(({ id }) => id),
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
