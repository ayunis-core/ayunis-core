import { randomUUID } from 'crypto';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import type { FindOneSkillUseCase } from 'src/domain/skills/application/use-cases/find-one-skill/find-one-skill.use-case';
import type { GetKnowledgeBasesByIdsUseCase } from 'src/domain/knowledge-bases/application/use-cases/get-knowledge-bases-by-ids/get-knowledge-bases-by-ids.use-case';
import type { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import type { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import {
  createMockContextService,
  createMockWorkspacesRepository,
  TEST_USER_ID,
  TEST_WORKSPACE_ID,
  aWorkspace,
} from '../../testing/workspace.fixtures';
import { BuildWorkspaceRunContextQuery } from './build-workspace-run-context.query';
import { BuildWorkspaceRunContextUseCase } from './build-workspace-run-context.use-case';

describe('BuildWorkspaceRunContextUseCase', () => {
  it('resolves assigned skills, knowledge bases, documents and instruction', async () => {
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
          documentCount: 3,
        },
      ],
      sourceIds: [sourceId],
    });
    const skill = new Skill({
      id: skillId,
      name: 'Permit Check',
      shortDescription: 'Checks permit applications',
      instructions: 'Check every permit application for missing parcel IDs.',
      mcpIntegrationIds: [mcpIntegrationId],
      userId: TEST_USER_ID,
    });
    const findOneSkillUseCase = {
      execute: jest.fn().mockResolvedValue({
        skill,
        isActive: false,
        isShared: false,
        isPinned: false,
      }),
    } as unknown as jest.Mocked<FindOneSkillUseCase>;
    const source = { id: sourceId, name: 'Setback rules.pdf' };
    const getSourcesByIdsUseCase = {
      execute: jest.fn().mockResolvedValue([source]),
    } as unknown as jest.Mocked<GetSourcesByIdsUseCase>;
    const getKnowledgeBasesByIdsUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<GetKnowledgeBasesByIdsUseCase>;
    const knowledgeBaseAccessService = {
      findAccessibleKnowledgeBase: jest.fn().mockResolvedValue({}),
      countSourcesByKnowledgeBaseIds: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<KnowledgeBaseAccessService>;
    const useCase = new BuildWorkspaceRunContextUseCase(
      repository,
      findOneSkillUseCase,
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
    expect(result.knowledgeBases).toHaveLength(1);
    expect(result.sources).toEqual([source]);
    expect(result.mcpIntegrationIds).toEqual([mcpIntegrationId]);
  });

  it('skips assigned skills that are no longer accessible', async () => {
    const accessibleSkillId = randomUUID();
    const revokedSkillId = randomUUID();
    const repository = createMockWorkspacesRepository();
    repository.getContextRefs.mockResolvedValue({
      skillIds: [accessibleSkillId, revokedSkillId],
      knowledgeBases: [],
      sourceIds: [],
    });
    repository.findById.mockResolvedValue(aWorkspace());
    const accessibleSkill = new Skill({
      id: accessibleSkillId,
      name: 'Accessible Skill',
      shortDescription: 'Still shared',
      instructions: 'Use accessible skill instructions.',
      userId: TEST_USER_ID,
    });
    const findOneSkillUseCase = {
      execute: jest
        .fn()
        .mockResolvedValueOnce({
          skill: accessibleSkill,
          isActive: false,
          isShared: true,
          isPinned: false,
        })
        .mockRejectedValueOnce(new SkillNotFoundError(revokedSkillId)),
    } as unknown as jest.Mocked<FindOneSkillUseCase>;
    const getSourcesByIdsUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<GetSourcesByIdsUseCase>;
    const getKnowledgeBasesByIdsUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<GetKnowledgeBasesByIdsUseCase>;
    const knowledgeBaseAccessService = {
      findAccessibleKnowledgeBase: jest.fn().mockResolvedValue({}),
      countSourcesByKnowledgeBaseIds: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<KnowledgeBaseAccessService>;
    const useCase = new BuildWorkspaceRunContextUseCase(
      repository,
      findOneSkillUseCase,
      getSourcesByIdsUseCase,
      getKnowledgeBasesByIdsUseCase,
      knowledgeBaseAccessService,
      createMockContextService(),
    );

    const result = await useCase.execute(
      new BuildWorkspaceRunContextQuery(TEST_WORKSPACE_ID),
    );

    expect(result.skills).toEqual([accessibleSkill]);
  });

  it('skips assigned knowledge bases that are no longer accessible', async () => {
    const accessibleKnowledgeBaseId = randomUUID();
    const revokedKnowledgeBaseId = randomUUID();
    const repository = createMockWorkspacesRepository();
    repository.findById.mockResolvedValue(aWorkspace());
    repository.getContextRefs.mockResolvedValue({
      skillIds: [],
      knowledgeBases: [
        {
          id: accessibleKnowledgeBaseId,
          name: 'Accessible KB',
          description: null,
          documentCount: 1,
        },
        {
          id: revokedKnowledgeBaseId,
          name: 'Revoked KB',
          description: null,
          documentCount: 1,
        },
      ],
      sourceIds: [],
    });
    const findOneSkillUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindOneSkillUseCase>;
    const getSourcesByIdsUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<GetSourcesByIdsUseCase>;
    const getKnowledgeBasesByIdsUseCase = {
      execute: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<GetKnowledgeBasesByIdsUseCase>;
    const knowledgeBaseAccessService = {
      findAccessibleKnowledgeBase: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(
          new KnowledgeBaseNotFoundError(revokedKnowledgeBaseId),
        ),
      countSourcesByKnowledgeBaseIds: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<KnowledgeBaseAccessService>;
    const useCase = new BuildWorkspaceRunContextUseCase(
      repository,
      findOneSkillUseCase,
      getSourcesByIdsUseCase,
      getKnowledgeBasesByIdsUseCase,
      knowledgeBaseAccessService,
      createMockContextService(),
    );

    const result = await useCase.execute(
      new BuildWorkspaceRunContextQuery(TEST_WORKSPACE_ID),
    );

    expect(result.knowledgeBases.map((kb) => kb.id)).toEqual([
      accessibleKnowledgeBaseId,
    ]);
    expect(result.runtimeKnowledgeBases.map((kb) => kb.id)).toEqual([
      accessibleKnowledgeBaseId,
    ]);
  });
});
