import { randomUUID } from 'crypto';
import type { CountKnowledgeBaseDocumentsUseCase } from 'src/domain/knowledge-bases/application/use-cases/count-knowledge-base-documents/count-knowledge-base-documents.use-case';
import type { GetWorkspaceSkillsUseCase } from 'src/domain/skills/application/use-cases/get-workspace-skills/get-workspace-skills.use-case';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import {
  aWorkspace,
  createMockContextService,
  createMockWorkspacesRepository,
  TEST_WORKSPACE_ID,
} from 'src/domain/workspaces/application/testing/workspace.fixtures';
import { GetWorkspaceAiContextUseCase } from './get-workspace-ai-context.use-case';

function setup() {
  const repository = createMockWorkspacesRepository();
  repository.findById.mockResolvedValue(
    aWorkspace({ instruction: 'Use building department wording.' }),
  );
  const skill = new WorkspaceSkill({
    name: 'Permit Check',
    shortDescription: 'Checks permit applications',
    instructions: 'Check every permit application.',
    workspaceId: TEST_WORKSPACE_ID,
  });
  const inactiveSkill = new WorkspaceSkill({
    name: 'Archived Check',
    shortDescription: 'Inactive',
    instructions: 'Do not use.',
    workspaceId: TEST_WORKSPACE_ID,
  });
  const knowledgeBaseId = randomUUID();
  repository.getContextRefs.mockResolvedValue({
    skillIds: [skill.id, inactiveSkill.id],
    knowledgeBases: [
      {
        id: knowledgeBaseId,
        name: 'Building Code',
        description: null,
        documentCount: 0,
        isActive: true,
      },
    ],
  });
  const getWorkspaceSkills = {
    execute: jest.fn().mockResolvedValue([
      { skill, isActive: true, isPinned: false },
      { skill: inactiveSkill, isActive: false, isPinned: false },
    ]),
  } as unknown as jest.Mocked<GetWorkspaceSkillsUseCase>;
  const countKnowledgeBaseDocuments = {
    execute: jest.fn().mockResolvedValue(new Map([[knowledgeBaseId, 3]])),
  } as unknown as jest.Mocked<CountKnowledgeBaseDocumentsUseCase>;
  return {
    useCase: new GetWorkspaceAiContextUseCase(
      repository,
      getWorkspaceSkills,
      countKnowledgeBaseDocuments,
      createMockContextService(),
    ),
    skill,
    knowledgeBaseId,
  };
}

describe(GetWorkspaceAiContextUseCase.name, () => {
  it('returns only active workspace resources with document counts', async () => {
    const { useCase, skill, knowledgeBaseId } = setup();

    const result = await useCase.execute({ workspaceId: TEST_WORKSPACE_ID });

    expect(result.instruction).toBe('Use building department wording.');
    expect(result.skills).toEqual([{ skill, isActive: true, isPinned: false }]);
    expect(result.knowledgeBases).toEqual([
      expect.objectContaining({ id: knowledgeBaseId, documentCount: 3 }),
    ]);
  });
});
