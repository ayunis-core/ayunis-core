import { randomUUID } from 'crypto';
import type { GetWorkspaceAiContextUseCase } from 'src/domain/workspaces/application/use-cases/get-workspace-ai-context/get-workspace-ai-context.use-case';
import { TEST_WORKSPACE_ID } from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { BuildWorkspaceRunContextQuery } from './build-workspace-run-context.query';
import { BuildWorkspaceRunContextUseCase } from './build-workspace-run-context.use-case';

describe(BuildWorkspaceRunContextUseCase.name, () => {
  it('uses the shared AI context for runtime context', async () => {
    const skill = new WorkspaceSkill({
      name: 'Permit Check',
      shortDescription: 'Checks permit applications',
      instructions: 'Check every permit application.',
      workspaceId: TEST_WORKSPACE_ID,
    });
    const workspaceAiContext = {
      instruction: 'Use building department wording.',
      skills: [{ skill, isActive: true, isPinned: true }],
      knowledgeBases: [
        {
          id: randomUUID(),
          name: 'Building Code',
          description: 'Rules for building permits',
          documentCount: 3,
          isActive: true,
        },
      ],
    };
    const getWorkspaceAiContext = {
      execute: jest.fn().mockResolvedValue(workspaceAiContext),
    } as unknown as jest.Mocked<GetWorkspaceAiContextUseCase>;
    const useCase = new BuildWorkspaceRunContextUseCase(getWorkspaceAiContext);

    const result = await useCase.execute(
      new BuildWorkspaceRunContextQuery(TEST_WORKSPACE_ID),
    );

    expect(getWorkspaceAiContext.execute).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: TEST_WORKSPACE_ID }),
    );
    expect(result).toEqual({
      ...workspaceAiContext,
      runtimeKnowledgeBases: workspaceAiContext.knowledgeBases,
    });
    expect(result).not.toHaveProperty('runtimeSources');
    expect(result).not.toHaveProperty('mcpIntegrationIds');
  });
});
