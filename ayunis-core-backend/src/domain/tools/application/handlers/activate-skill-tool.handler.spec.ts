import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ActivateSkillToolHandler } from './activate-skill-tool.handler';
import { FindSkillByNameUseCase } from 'src/domain/skills/application/use-cases/find-skill-by-name/find-skill-by-name.use-case';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { SkillActivationService } from 'src/domain/skills/application/services/skill-activation.service';
import type { ActivateSkillTool } from '../../domain/tools/activate-skill-tool.entity';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ToolExecutionFailedError } from '../tools.errors';

describe('ActivateSkillToolHandler', () => {
  let handler: ActivateSkillToolHandler;
  let mockFindSkillByName: jest.Mocked<FindSkillByNameUseCase>;
  let mockFindThread: jest.Mocked<FindThreadUseCase>;
  let mockSkillActivationService: jest.Mocked<SkillActivationService>;

  const mockThreadId = randomUUID();
  const mockSkillId = randomUUID();

  beforeAll(async () => {
    mockFindSkillByName = {
      execute: jest.fn(),
    } as any;
    mockFindThread = {
      execute: jest.fn(),
    } as any;
    mockSkillActivationService = {
      activateOnThread: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivateSkillToolHandler,
        { provide: FindSkillByNameUseCase, useValue: mockFindSkillByName },
        { provide: FindThreadUseCase, useValue: mockFindThread },
        {
          provide: SkillActivationService,
          useValue: mockSkillActivationService,
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

  function createMockTool(skillName: string) {
    return {
      name: 'activate_skill',
      validateParams: jest.fn().mockReturnValue({ skill_name: skillName }),
    } as unknown as ActivateSkillTool;
  }

  it('should delegate activation to SkillActivationService with the skill ID and thread', async () => {
    const skill = createMockSkill();
    const thread = new Thread({
      userId: randomUUID(),
      messages: [],
      sourceAssignments: [],
    });

    mockFindSkillByName.execute.mockResolvedValue(skill);
    mockFindThread.execute.mockResolvedValue({
      thread,
      isLongChat: false,
    });
    mockSkillActivationService.activateOnThread.mockResolvedValue({
      instructions: 'You are a budget analysis assistant.',
      skillName: 'Budget Analysis',
    });

    const tool = createMockTool('Budget Analysis');

    await handler.execute({
      tool,
      input: { skill_name: 'Budget Analysis' },
      context: { threadId: mockThreadId, orgId: randomUUID() },
    });

    expect(mockSkillActivationService.activateOnThread).toHaveBeenCalledWith(
      skill.id,
      thread,
    );
  });

  it('should throw ToolExecutionFailedError when skill is not found', async () => {
    mockFindSkillByName.execute.mockResolvedValue(null as any);
    const tool = createMockTool('Nonexistent Skill');

    await expect(
      handler.execute({
        tool,
        input: { skill_name: 'Nonexistent Skill' },
        context: { threadId: mockThreadId, orgId: randomUUID() },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });

  it('should return the skill instructions from SkillActivationService', async () => {
    const instructions = 'You are a zoning compliance assistant.';
    const skill = createMockSkill({ instructions });
    const thread = new Thread({
      userId: randomUUID(),
      messages: [],
    });

    mockFindSkillByName.execute.mockResolvedValue(skill);
    mockFindThread.execute.mockResolvedValue({
      thread,
      isLongChat: false,
    });
    mockSkillActivationService.activateOnThread.mockResolvedValue({
      instructions,
      skillName: 'Budget Analysis',
    });

    const tool = createMockTool('Budget Analysis');

    const result = await handler.execute({
      tool,
      input: { skill_name: 'Budget Analysis' },
      context: { threadId: mockThreadId, orgId: randomUUID() },
    });

    expect(result).toBe(instructions);
  });

  it('should wrap unexpected errors from SkillActivationService as ToolExecutionFailedError', async () => {
    const skill = createMockSkill();
    const thread = new Thread({
      userId: randomUUID(),
      messages: [],
    });

    mockFindSkillByName.execute.mockResolvedValue(skill);
    mockFindThread.execute.mockResolvedValue({
      thread,
      isLongChat: false,
    });
    mockSkillActivationService.activateOnThread.mockRejectedValue(
      new Error('Database connection lost'),
    );

    const tool = createMockTool('Budget Analysis');

    await expect(
      handler.execute({
        tool,
        input: { skill_name: 'Budget Analysis' },
        context: { threadId: mockThreadId, orgId: randomUUID() },
      }),
    ).rejects.toThrow(ToolExecutionFailedError);
  });
});
