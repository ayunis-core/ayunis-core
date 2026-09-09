import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { randomUUID } from 'crypto';
import type { CountKnowledgeBaseDocumentsUseCase } from 'src/domain/knowledge-bases/application/use-cases/count-knowledge-base-documents/count-knowledge-base-documents.use-case';
import type { GetWorkspaceSkillsUseCase } from 'src/domain/skills/application/use-cases/get-workspace-skills/get-workspace-skills.use-case';

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
    const inactiveKnowledgeBaseId = randomUUID();
    const mcpIntegrationId = randomUUID();
    const repository = createMockWorkspacesRepository();
    repository.findById.mockResolvedValue(
      aWorkspace({ instruction: 'Use building department wording.' }),
    );
    const skill = new WorkspaceSkill({
      id: skillId,
      name: 'Permit Check',
      shortDescription: 'Checks permit applications',
      instructions: 'Check every permit application.',
      mcpIntegrationIds: [mcpIntegrationId],
      sourceIds: [sourceId],
      knowledgeBaseIds: [knowledgeBaseId, inactiveKnowledgeBaseId],
      workspaceId: TEST_WORKSPACE_ID,
    });
    const inactiveSkill = new WorkspaceSkill({
      name: 'Disabled project skill',
      shortDescription: 'Must not affect runs',
      instructions: 'This instruction must be excluded.',
      mcpIntegrationIds: [randomUUID()],
      workspaceId: TEST_WORKSPACE_ID,
    });
    repository.getContextRefs.mockResolvedValue({
      skillIds: [skillId, inactiveSkill.id],
      knowledgeBases: [
        {
          id: knowledgeBaseId,
          name: 'Building Code',
          description: 'Rules for building permits',
          documentCount: 0,
          isActive: true,
        },
        {
          id: inactiveKnowledgeBaseId,
          name: 'Archived rules',
          description: 'Must not affect runs',
          documentCount: 0,
          isActive: false,
        },
      ],
    });
    const workspaceSkillService = {
      execute: jest.fn().mockResolvedValue([
        { skill, isActive: true, isPinned: true },
        { skill: inactiveSkill, isActive: false, isPinned: false },
      ]),
    } as unknown as jest.Mocked<GetWorkspaceSkillsUseCase>;
    const knowledgeBaseAccessService = {
      execute: jest.fn().mockResolvedValue(new Map([[knowledgeBaseId, 3]])),
    } as unknown as jest.Mocked<CountKnowledgeBaseDocumentsUseCase>;
    const useCase = new BuildWorkspaceRunContextUseCase(
      repository,
      workspaceSkillService,
      knowledgeBaseAccessService,
      createMockContextService(),
    );

    const result = await useCase.execute(
      new BuildWorkspaceRunContextQuery(TEST_WORKSPACE_ID),
    );

    expect(result.instruction).toBe('Use building department wording.');
    expect(result.skills).toEqual([{ skill, isActive: true, isPinned: true }]);
    expect(result).not.toHaveProperty('skillStates');
    expect(result.knowledgeBases).toHaveLength(1);
    expect(result.runtimeKnowledgeBases).toEqual(result.knowledgeBases);
    expect(result.knowledgeBases[0]?.documentCount).toBe(3);
    expect(result).not.toHaveProperty('runtimeSources');
    expect(result).not.toHaveProperty('mcpIntegrationIds');
  });
});
