import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SkillActivationService } from './skill-activation.service';
import { SkillAccessService } from 'src/domain/skills/application/services/skill-access.service';
import { AddSourceToThreadUseCase } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source-to-thread.use-case';
import { AddMcpIntegrationToThreadUseCase } from 'src/domain/threads/application/use-cases/add-mcp-integration-to-thread/add-mcp-integration-to-thread.use-case';
import { AddKnowledgeBaseToThreadUseCase } from 'src/domain/threads/application/use-cases/add-knowledge-base-to-thread/add-knowledge-base-to-thread.use-case';
import { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { SourceAlreadyAssignedError } from 'src/domain/threads/application/threads.errors';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { UrlSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { TextType } from 'src/domain/sources/domain/source-type.enum';
import type { UUID } from 'crypto';

describe('SkillActivationService', () => {
  let service: SkillActivationService;
  let skillAccessService: jest.Mocked<SkillAccessService>;
  let addSourceToThreadUseCase: jest.Mocked<AddSourceToThreadUseCase>;
  let addMcpIntegrationToThreadUseCase: jest.Mocked<AddMcpIntegrationToThreadUseCase>;
  let addKnowledgeBaseToThreadUseCase: jest.Mocked<AddKnowledgeBaseToThreadUseCase>;
  let getSourcesByIdsUseCase: jest.Mocked<GetSourcesByIdsUseCase>;

  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const skillId = '550e8400-e29b-41d4-a716-446655440000' as UUID;
  const sourceId1 = '660e8400-e29b-41d4-a716-446655440001' as UUID;
  const sourceId2 = '660e8400-e29b-41d4-a716-446655440002' as UUID;
  const mcpIntegrationId1 = '770e8400-e29b-41d4-a716-446655440001' as UUID;
  const mcpIntegrationId2 = '770e8400-e29b-41d4-a716-446655440002' as UUID;
  const knowledgeBaseId1 = '880e8400-e29b-41d4-a716-446655440001' as UUID;
  const knowledgeBaseId2 = '880e8400-e29b-41d4-a716-446655440002' as UUID;

  const makeThread = () =>
    new Thread({
      userId,
      messages: [],
    });

  const makeSkill = (
    overrides?: Partial<ConstructorParameters<typeof Skill>[0]>,
  ) =>
    new Skill({
      id: skillId,
      name: 'Legal Research',
      shortDescription: 'Research legal topics.',
      instructions: 'Analyze the legal question thoroughly.',
      sourceIds: [sourceId1, sourceId2],
      mcpIntegrationIds: [mcpIntegrationId1, mcpIntegrationId2],
      knowledgeBaseIds: [knowledgeBaseId1, knowledgeBaseId2],
      userId,
      ...overrides,
    });

  const makeSource = (id: UUID) =>
    new UrlSource({
      id,
      url: `https://example.com/doc-${id}`,
      contentChunks: [],
      text: 'Sample document content.',
      name: `Source ${id}`,
      type: TextType.WEB,
    });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillActivationService,
        {
          provide: SkillAccessService,
          useValue: { findAccessibleSkill: jest.fn() },
        },
        {
          provide: AddSourceToThreadUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: AddMcpIntegrationToThreadUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: AddKnowledgeBaseToThreadUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetSourcesByIdsUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(SkillActivationService);
    skillAccessService = module.get(SkillAccessService);
    addSourceToThreadUseCase = module.get(AddSourceToThreadUseCase);
    addMcpIntegrationToThreadUseCase = module.get(
      AddMcpIntegrationToThreadUseCase,
    );
    addKnowledgeBaseToThreadUseCase = module.get(
      AddKnowledgeBaseToThreadUseCase,
    );
    getSourcesByIdsUseCase = module.get(GetSourcesByIdsUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  describe('activateOnThread', () => {
    it('should add sources, MCP integrations, and knowledge bases from the skill to the thread', async () => {
      const thread = makeThread();
      const skill = makeSkill();
      const sources = [makeSource(sourceId1), makeSource(sourceId2)];

      skillAccessService.findAccessibleSkill.mockResolvedValue(skill);
      getSourcesByIdsUseCase.execute.mockResolvedValue(sources);

      const result = await service.activateOnThread(skillId, thread);

      expect(skillAccessService.findAccessibleSkill).toHaveBeenCalledWith(
        skillId,
      );
      expect(addSourceToThreadUseCase.execute).toHaveBeenCalledTimes(2);
      expect(addMcpIntegrationToThreadUseCase.execute).toHaveBeenCalledTimes(2);
      expect(addKnowledgeBaseToThreadUseCase.execute).toHaveBeenCalledTimes(2);
      expect(result.instructions).toBe(
        'Analyze the legal question thoroughly.',
      );
      expect(result.skillName).toBe('Legal Research');
    });

    it('should return the skill instructions and name', async () => {
      const thread = makeThread();
      const instructions =
        'You are a municipal budget analyst. Provide detailed breakdowns.';
      const skill = makeSkill({
        name: 'Budget Analysis',
        instructions,
        sourceIds: [],
        mcpIntegrationIds: [],
        knowledgeBaseIds: [],
      });

      skillAccessService.findAccessibleSkill.mockResolvedValue(skill);
      getSourcesByIdsUseCase.execute.mockResolvedValue([]);

      const result = await service.activateOnThread(skillId, thread);

      expect(result.instructions).toBe(instructions);
      expect(result.skillName).toBe('Budget Analysis');
    });

    it('should propagate SkillNotFoundError when user cannot access the skill', async () => {
      const thread = makeThread();
      skillAccessService.findAccessibleSkill.mockRejectedValue(
        new SkillNotFoundError(skillId),
      );

      await expect(service.activateOnThread(skillId, thread)).rejects.toThrow(
        SkillNotFoundError,
      );

      expect(addSourceToThreadUseCase.execute).not.toHaveBeenCalled();
      expect(addMcpIntegrationToThreadUseCase.execute).not.toHaveBeenCalled();
      expect(addKnowledgeBaseToThreadUseCase.execute).not.toHaveBeenCalled();
    });

    it('should skip sources that are already assigned to the thread', async () => {
      const thread = makeThread();
      const skill = makeSkill({ mcpIntegrationIds: [] });
      const sources = [makeSource(sourceId1), makeSource(sourceId2)];

      skillAccessService.findAccessibleSkill.mockResolvedValue(skill);
      getSourcesByIdsUseCase.execute.mockResolvedValue(sources);
      addSourceToThreadUseCase.execute
        .mockRejectedValueOnce(new SourceAlreadyAssignedError(sourceId1))
        .mockResolvedValueOnce(undefined);

      const result = await service.activateOnThread(skillId, thread);

      expect(addSourceToThreadUseCase.execute).toHaveBeenCalledTimes(2);
      expect(result.instructions).toBe(
        'Analyze the legal question thoroughly.',
      );
    });

    it('should not crash when all sources are already assigned (repeated activation)', async () => {
      const thread = makeThread();
      const skill = makeSkill();
      const sources = [makeSource(sourceId1), makeSource(sourceId2)];

      skillAccessService.findAccessibleSkill.mockResolvedValue(skill);
      getSourcesByIdsUseCase.execute.mockResolvedValue(sources);
      addSourceToThreadUseCase.execute.mockRejectedValue(
        new SourceAlreadyAssignedError(sourceId1),
      );

      const result = await service.activateOnThread(skillId, thread);

      expect(result.instructions).toBe(
        'Analyze the legal question thoroughly.',
      );
    });

    it('should rethrow unexpected errors from addSourceToThread', async () => {
      const thread = makeThread();
      const skill = makeSkill({ mcpIntegrationIds: [] });
      const sources = [makeSource(sourceId1)];

      skillAccessService.findAccessibleSkill.mockResolvedValue(skill);
      getSourcesByIdsUseCase.execute.mockResolvedValue(sources);
      addSourceToThreadUseCase.execute.mockRejectedValue(
        new Error('Database connection lost'),
      );

      await expect(service.activateOnThread(skillId, thread)).rejects.toThrow(
        'Database connection lost',
      );
    });

    it('should copy knowledge bases to the thread with originSkillId', async () => {
      const thread = makeThread();
      const skill = makeSkill({
        sourceIds: [],
        mcpIntegrationIds: [],
        knowledgeBaseIds: [knowledgeBaseId1, knowledgeBaseId2],
      });

      skillAccessService.findAccessibleSkill.mockResolvedValue(skill);
      getSourcesByIdsUseCase.execute.mockResolvedValue([]);

      await service.activateOnThread(skillId, thread);

      expect(addKnowledgeBaseToThreadUseCase.execute).toHaveBeenCalledTimes(2);
      expect(addKnowledgeBaseToThreadUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: thread.id,
          knowledgeBaseId: knowledgeBaseId1,
          originSkillId: skillId,
        }),
      );
      expect(addKnowledgeBaseToThreadUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: thread.id,
          knowledgeBaseId: knowledgeBaseId2,
          originSkillId: skillId,
        }),
      );
    });

    it('should work with empty knowledgeBaseIds', async () => {
      const thread = makeThread();
      const skill = makeSkill({
        sourceIds: [],
        mcpIntegrationIds: [],
        knowledgeBaseIds: [],
      });

      skillAccessService.findAccessibleSkill.mockResolvedValue(skill);
      getSourcesByIdsUseCase.execute.mockResolvedValue([]);

      const result = await service.activateOnThread(skillId, thread);

      expect(addKnowledgeBaseToThreadUseCase.execute).not.toHaveBeenCalled();
      expect(result.instructions).toBe(
        'Analyze the legal question thoroughly.',
      );
    });

    it('should log a warning and continue when a knowledge base is not found (stale ID)', async () => {
      const thread = makeThread();
      const skill = makeSkill({
        sourceIds: [],
        mcpIntegrationIds: [],
        knowledgeBaseIds: [knowledgeBaseId1, knowledgeBaseId2],
      });

      skillAccessService.findAccessibleSkill.mockResolvedValue(skill);
      getSourcesByIdsUseCase.execute.mockResolvedValue([]);
      addKnowledgeBaseToThreadUseCase.execute
        .mockRejectedValueOnce(new KnowledgeBaseNotFoundError(knowledgeBaseId1))
        .mockResolvedValueOnce(undefined);

      const result = await service.activateOnThread(skillId, thread);

      expect(addKnowledgeBaseToThreadUseCase.execute).toHaveBeenCalledTimes(2);
      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Knowledge base not found, skipping (stale reference)',
        expect.objectContaining({ knowledgeBaseId: knowledgeBaseId1 }),
      );
      expect(result.instructions).toBe(
        'Analyze the legal question thoroughly.',
      );
    });

    it('should rethrow unexpected errors from addKnowledgeBaseToThread', async () => {
      const thread = makeThread();
      const skill = makeSkill({
        sourceIds: [],
        mcpIntegrationIds: [],
        knowledgeBaseIds: [knowledgeBaseId1],
      });

      skillAccessService.findAccessibleSkill.mockResolvedValue(skill);
      getSourcesByIdsUseCase.execute.mockResolvedValue([]);
      addKnowledgeBaseToThreadUseCase.execute.mockRejectedValue(
        new Error('Database connection lost'),
      );

      await expect(service.activateOnThread(skillId, thread)).rejects.toThrow(
        'Database connection lost',
      );
    });

    it('should handle repeated activation with knowledge bases (idempotent)', async () => {
      const thread = makeThread();
      const skill = makeSkill({
        sourceIds: [],
        mcpIntegrationIds: [],
        knowledgeBaseIds: [knowledgeBaseId1],
      });

      skillAccessService.findAccessibleSkill.mockResolvedValue(skill);
      getSourcesByIdsUseCase.execute.mockResolvedValue([]);

      // First activation
      await service.activateOnThread(skillId, thread);
      // Second activation (AddKnowledgeBaseToThreadUseCase is idempotent — returns early)
      await service.activateOnThread(skillId, thread);

      expect(addKnowledgeBaseToThreadUseCase.execute).toHaveBeenCalledTimes(2);
    });
  });
});
