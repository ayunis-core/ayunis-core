import { randomUUID } from 'crypto';
import type { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import type { GetKnowledgeBasesByIdsUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-bases-by-ids/get-knowledge-bases-by-ids.use-case';
import type { GetSkillsByIdsUseCase } from 'src/domain/skills/application/use-cases/get-skills-by-ids/get-skills-by-ids.use-case';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import type { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import {
  aWorkspace,
  createMockContextService,
  createMockWorkspacesRepository,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { BuildWorkspaceRunContextQuery } from './build-workspace-run-context.query';
import { BuildWorkspaceRunContextUseCase } from './build-workspace-run-context.use-case';

describe(BuildWorkspaceRunContextUseCase.name, () => {
  it('resolves workspace-owned resources and instruction', async () => {
    const skillId = randomUUID();
    const sourceId = randomUUID();
    const knowledgeBaseId = randomUUID();
    const mcpIntegrationId = randomUUID();
    const repository = createMockWorkspacesRepository();
    repository.findById.mockResolvedValue(
      aWorkspace({ instruction: 'Use building department wording.' }),
    );
    repository.getContextRefs.mockResolvedValue({
      skillIds: [skillId],
      knowledgeBases: [
        {
          id: knowledgeBaseId,
          name: 'Building Code',
          description: 'Rules for building permits',
          documentCount: 0,
        },
      ],
      sourceIds: [sourceId],
    });
    const skill = new Skill({
      id: skillId,
      name: 'Permit Check',
      shortDescription: 'Checks permit applications',
      instructions: 'Check every permit application.',
      mcpIntegrationIds: [mcpIntegrationId],
      workspaceId: TEST_WORKSPACE_ID,
    });
    const getSkillsByIdsUseCase = {
      execute: jest.fn().mockResolvedValue([skill]),
    } as unknown as jest.Mocked<GetSkillsByIdsUseCase>;
    const source = { id: sourceId, name: 'Setback rules.pdf' };
    const getSourcesByIdsUseCase = {
      execute: jest.fn().mockResolvedValue([source]),
    } as unknown as jest.Mocked<GetSourcesByIdsUseCase>;
    const getKnowledgeBasesByIdsUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<GetKnowledgeBasesByIdsUseCase>;
    const knowledgeBaseAccessService = {
      countSourcesByKnowledgeBaseIds: jest
        .fn()
        .mockResolvedValue(new Map([[knowledgeBaseId, 3]])),
    } as unknown as jest.Mocked<KnowledgeBaseAccessService>;
    const useCase = new BuildWorkspaceRunContextUseCase(
      repository,
      getSkillsByIdsUseCase,
      getSourcesByIdsUseCase,
      getKnowledgeBasesByIdsUseCase,
      knowledgeBaseAccessService,
      createMockContextService(),
    );

    const result = await useCase.execute(
      new BuildWorkspaceRunContextQuery(TEST_WORKSPACE_ID),
    );

    expect(result.instruction).toBe('Use building department wording.');
    expect(result.skills).toEqual([skill]);
    expect(result.knowledgeBases[0]?.documentCount).toBe(3);
    expect(result.sources).toEqual([source]);
    expect(result.mcpIntegrationIds).toEqual([mcpIntegrationId]);
  });
});
