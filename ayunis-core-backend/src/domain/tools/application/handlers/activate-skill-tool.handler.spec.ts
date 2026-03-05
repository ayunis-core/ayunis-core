import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ActivateSkillToolHandler } from './activate-skill-tool.handler';
import { FindSkillByNameUseCase } from 'src/domain/skills/application/use-cases/find-skill-by-name/find-skill-by-name.use-case';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { SkillActivationService } from 'src/domain/skills/application/services/skill-activation.service';
import { FindAlwaysOnTemplateByNameUseCase } from 'src/domain/skill-templates/application/use-cases/find-always-on-template-by-name/find-always-on-template-by-name.use-case';
import { ActivateSkillTool } from '../../domain/tools/activate-skill-tool.entity';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { AlwaysOnSkillTemplate } from 'src/domain/skill-templates/domain/always-on-skill-template.entity';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ToolExecutionFailedError } from '../tools.errors';

describe('ActivateSkillToolHandler', () => {
  let handler: ActivateSkillToolHandler;
  let mockFindSkillByName: jest.Mocked<FindSkillByNameUseCase>;
  let mockFindThread: jest.Mocked<FindThreadUseCase>;
  let mockSkillActivationService: jest.Mocked<SkillActivationService>;
  let mockFindAlwaysOnTemplateByName: jest.Mocked<FindAlwaysOnTemplateByNameUseCase>;

  const mockThreadId = randomUUID();
  const mockSkillId = randomUUID();

  beforeAll(async () => {
    mockFindSkillByName = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindSkillByNameUseCase>;
    mockFindThread = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindThreadUseCase>;
    mockSkillActivationService = {
      activateOnThread: jest.fn(),
    } as unknown as jest.Mocked<SkillActivationService>;
    mockFindAlwaysOnTemplateByName = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindAlwaysOnTemplateByNameUseCase>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivateSkillToolHandler,
        { provide: FindSkillByNameUseCase, useValue: mockFindSkillByName },
        { provide: FindThreadUseCase, useValue: mockFindThread },
        {
          provide: SkillActivationService,
          useValue: mockSkillActivationService,
        },
        {
          provide: FindAlwaysOnTemplateByNameUseCase,
          useValue: mockFindAlwaysOnTemplateByName,
        },
      ],
    }).compile();

    handler = module.get<ActivateSkillToolHandler>(ActivateSkillToolHandler);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createMockSkill(
    overrides?: Partial<ConstructorParameters<typeof Skill>[0]>,
  ) {
    return new Skill({
      id: mockSkillId,
      name: 'Budget Analysis',
      shortDescription: 'Analyzes municipal budgets',
      instructions: 'You are a budget analysis assistant.',
      sourceIds: [],
      mcpIntegrationIds: [],
      userId: randomUUID(),
      ...overrides,
    });
  }

  function createMockTemplate(
    overrides?: Partial<ConstructorParameters<typeof AlwaysOnSkillTemplate>[0]>,
  ) {
    return new AlwaysOnSkillTemplate({
      name: 'German Administrative Law',
      shortDescription: 'Administrative law guidance',
      instructions: 'You are a German administrative law expert.',
      isActive: true,
      ...overrides,
    });
  }

  function createToolWithSlugMap(slugMap: Map<string, string>) {
    return new ActivateSkillTool(slugMap);
  }

  describe('user-prefixed slugs', () => {
    it('should route to existing skill flow and return instructions', async () => {
      const skill = createMockSkill();
      const thread = new Thread({
        userId: randomUUID(),
        messages: [],
        sourceAssignments: [],
      });
      const instructions = 'You are a budget analysis assistant.';

      const slugMap = new Map([['user__budget-analysis', 'Budget Analysis']]);
      const tool = createToolWithSlugMap(slugMap);

      mockFindSkillByName.execute.mockResolvedValue(skill);
      mockFindThread.execute.mockResolvedValue({
        thread,
        isLongChat: false,
      });
      mockSkillActivationService.activateOnThread.mockResolvedValue({
        instructions,
        skillName: 'Budget Analysis',
      });

      const result = await handler.execute({
        tool,
        input: { skill_slug: 'user__budget-analysis' },
        context: { threadId: mockThreadId, orgId: randomUUID() },
      });

      expect(result).toBe(instructions);
      expect(mockFindSkillByName.execute).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Budget Analysis' }),
      );
      expect(mockSkillActivationService.activateOnThread).toHaveBeenCalledWith(
        skill.id,
        thread,
      );
      expect(mockFindAlwaysOnTemplateByName.execute).not.toHaveBeenCalled();
    });

    it('should throw ToolExecutionFailedError when user skill is not found', async () => {
      const slugMap = new Map([
        ['user__nonexistent-skill', 'Nonexistent Skill'],
      ]);
      const tool = createToolWithSlugMap(slugMap);

      mockFindSkillByName.execute.mockResolvedValue(null as unknown as Skill);

      await expect(
        handler.execute({
          tool,
          input: { skill_slug: 'user__nonexistent-skill' },
          context: { threadId: mockThreadId, orgId: randomUUID() },
        }),
      ).rejects.toThrow(ToolExecutionFailedError);
    });
  });

  describe('system-prefixed slugs', () => {
    it('should route to template lookup and return instructions', async () => {
      const template = createMockTemplate();
      const slugMap = new Map([
        ['system__german-administrative-law', 'German Administrative Law'],
      ]);
      const tool = createToolWithSlugMap(slugMap);

      mockFindAlwaysOnTemplateByName.execute.mockResolvedValue(template);

      const result = await handler.execute({
        tool,
        input: { skill_slug: 'system__german-administrative-law' },
        context: { threadId: mockThreadId, orgId: randomUUID() },
      });

      expect(result).toBe('You are a German administrative law expert.');
      expect(mockFindAlwaysOnTemplateByName.execute).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'German Administrative Law' }),
      );
      expect(mockFindSkillByName.execute).not.toHaveBeenCalled();
      expect(
        mockSkillActivationService.activateOnThread,
      ).not.toHaveBeenCalled();
    });

    it('should throw ToolExecutionFailedError when system template is not found', async () => {
      const slugMap = new Map([
        ['system__nonexistent-template', 'Nonexistent Template'],
      ]);
      const tool = createToolWithSlugMap(slugMap);

      mockFindAlwaysOnTemplateByName.execute.mockResolvedValue(null);

      await expect(
        handler.execute({
          tool,
          input: { skill_slug: 'system__nonexistent-template' },
          context: { threadId: mockThreadId, orgId: randomUUID() },
        }),
      ).rejects.toThrow(ToolExecutionFailedError);
    });
  });

  describe('unresolvable slugs', () => {
    it('should throw ToolExecutionFailedError when slug is not in the map', async () => {
      const slugMap = new Map([['user__budget-analysis', 'Budget Analysis']]);
      const tool = createToolWithSlugMap(slugMap);

      // Pass a slug that's not in the enum — bypass validateParams by mocking
      const mockTool = {
        ...tool,
        name: 'activate_skill',
        validateParams: jest
          .fn()
          .mockReturnValue({ skill_slug: 'user__unknown-slug' }),
        resolveOriginalName: tool.resolveOriginalName.bind(tool),
      } as unknown as ActivateSkillTool;

      await expect(
        handler.execute({
          tool: mockTool,
          input: { skill_slug: 'user__unknown-slug' },
          context: { threadId: mockThreadId, orgId: randomUUID() },
        }),
      ).rejects.toThrow(ToolExecutionFailedError);
    });
  });

  describe('error wrapping', () => {
    it('should wrap unexpected errors from FindAlwaysOnTemplateByNameUseCase as ToolExecutionFailedError', async () => {
      const slugMap = new Map([
        ['system__german-administrative-law', 'German Administrative Law'],
      ]);
      const tool = createToolWithSlugMap(slugMap);

      mockFindAlwaysOnTemplateByName.execute.mockRejectedValue(
        new Error('Database connection lost'),
      );

      await expect(
        handler.execute({
          tool,
          input: { skill_slug: 'system__german-administrative-law' },
          context: { threadId: mockThreadId, orgId: randomUUID() },
        }),
      ).rejects.toThrow(ToolExecutionFailedError);
    });

    it('should wrap unexpected errors from SkillActivationService as ToolExecutionFailedError', async () => {
      const skill = createMockSkill();
      const thread = new Thread({
        userId: randomUUID(),
        messages: [],
      });

      const slugMap = new Map([['user__budget-analysis', 'Budget Analysis']]);
      const tool = createToolWithSlugMap(slugMap);

      mockFindSkillByName.execute.mockResolvedValue(skill);
      mockFindThread.execute.mockResolvedValue({
        thread,
        isLongChat: false,
      });
      mockSkillActivationService.activateOnThread.mockRejectedValue(
        new Error('Database connection lost'),
      );

      await expect(
        handler.execute({
          tool,
          input: { skill_slug: 'user__budget-analysis' },
          context: { threadId: mockThreadId, orgId: randomUUID() },
        }),
      ).rejects.toThrow(ToolExecutionFailedError);
    });
  });
});
