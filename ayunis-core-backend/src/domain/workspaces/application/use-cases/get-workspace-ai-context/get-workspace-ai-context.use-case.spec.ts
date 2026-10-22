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
import type { GetLinkedWorkspaceSkillsUseCase } from 'src/domain/skills/application/use-cases/get-linked-workspace-skills/get-linked-workspace-skills.use-case';
import type { GetLinkedWorkspaceKnowledgeBasesUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-linked-workspace-knowledge-bases/get-linked-workspace-knowledge-bases.use-case';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
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
  const linkedSkill = new PersonalSkill({
    name: 'Protokoll zusammenfassen',
    shortDescription: 'Fasst Besprechungen zusammen',
    instructions: 'Fasse zusammen.',
    userId: randomUUID(),
  });
  const linkedKnowledgeBase = new PersonalKnowledgeBase({
    name: 'Satzungen',
    description: 'Alle Satzungen',
    userId: randomUUID(),
    orgId: randomUUID(),
  });
  const countKnowledgeBaseDocuments = {
    execute: jest.fn().mockResolvedValue(
      new Map([
        [knowledgeBaseId, 3],
        [linkedKnowledgeBase.id, 5],
      ]),
    ),
  } as unknown as jest.Mocked<CountKnowledgeBaseDocumentsUseCase>;
  const getLinkedSkills = {
    execute: jest.fn().mockResolvedValue([linkedSkill]),
  } as unknown as jest.Mocked<GetLinkedWorkspaceSkillsUseCase>;
  const getLinkedKnowledgeBases = {
    execute: jest.fn().mockResolvedValue([linkedKnowledgeBase]),
  } as unknown as jest.Mocked<GetLinkedWorkspaceKnowledgeBasesUseCase>;
  return {
    useCase: new GetWorkspaceAiContextUseCase(
      repository,
      getWorkspaceSkills,
      countKnowledgeBaseDocuments,
      createMockContextService(),
      getLinkedSkills,
      getLinkedKnowledgeBases,
    ),
    skill,
    knowledgeBaseId,
    linkedSkill,
    linkedKnowledgeBase,
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

  it('adds linked skills and knowledge bases as always active', async () => {
    const { useCase, linkedSkill, linkedKnowledgeBase } = setup();

    const result = await useCase.execute({ workspaceId: TEST_WORKSPACE_ID });

    expect(result.linkedSkills).toEqual([linkedSkill]);
    expect(result.linkedKnowledgeBases).toEqual([
      expect.objectContaining({
        id: linkedKnowledgeBase.id,
        name: 'Satzungen',
        description: 'Alle Satzungen',
        documentCount: 5,
        isActive: true,
      }),
    ]);
  });
});
