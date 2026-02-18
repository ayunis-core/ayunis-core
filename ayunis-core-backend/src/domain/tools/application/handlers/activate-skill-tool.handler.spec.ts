import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ActivateSkillToolHandler } from './activate-skill-tool.handler';
import { FindSkillByNameUseCase } from 'src/domain/skills/application/use-cases/find-skill-by-name/find-skill-by-name.use-case';
import { AddSourceToThreadUseCase } from 'src/domain/threads/application/use-cases/add-source-to-thread/add-source-to-thread.use-case';
import { AddMcpIntegrationToThreadUseCase } from 'src/domain/threads/application/use-cases/add-mcp-integration-to-thread/add-mcp-integration-to-thread.use-case';
import { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import { GetSourcesByIdsUseCase } from 'src/domain/sources/application/use-cases/get-sources-by-ids/get-sources-by-ids.use-case';
import { ActivateSkillTool } from '../../domain/tools/activate-skill-tool.entity';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import { ToolExecutionFailedError } from '../tools.errors';

class ConcreteSource extends Source {
  constructor(params: { id?: string; name: string }) {
    super({
      id: params.id as any,
      type: SourceType.TEXT,
      name: params.name,
    });
  }
}

describe('ActivateSkillToolHandler', () => {
  let handler: ActivateSkillToolHandler;
  let mockFindSkillByName: jest.Mocked<FindSkillByNameUseCase>;
  let mockAddSourceToThread: jest.Mocked<AddSourceToThreadUseCase>;
  let mockAddMcpIntegration: jest.Mocked<AddMcpIntegrationToThreadUseCase>;
  let mockFindThread: jest.Mocked<FindThreadUseCase>;
  let mockGetSourcesByIds: jest.Mocked<GetSourcesByIdsUseCase>;

  const mockThreadId = randomUUID();
  const mockSkillId = randomUUID();
  const mockSourceId = randomUUID();

  beforeEach(async () => {
    mockFindSkillByName = {
      execute: jest.fn(),
    } as any;
    mockAddSourceToThread = {
      execute: jest.fn(),
    } as any;
    mockAddMcpIntegration = {
      execute: jest.fn(),
    } as any;
    mockFindThread = {
      execute: jest.fn(),
    } as any;
    mockGetSourcesByIds = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivateSkillToolHandler,
        { provide: FindSkillByNameUseCase, useValue: mockFindSkillByName },
        { provide: AddSourceToThreadUseCase, useValue: mockAddSourceToThread },
        {
          provide: AddMcpIntegrationToThreadUseCase,
          useValue: mockAddMcpIntegration,
        },
        { provide: FindThreadUseCase, useValue: mockFindThread },
        { provide: GetSourcesByIdsUseCase, useValue: mockGetSourcesByIds },
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
      sourceIds: [mockSourceId],
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

  it('should pass the skill ID as originSkillId when adding sources to the thread', async () => {
    const skill = createMockSkill();
    const thread = new Thread({
      userId: randomUUID(),
      messages: [],
      sourceAssignments: [],
    });
    const source = new ConcreteSource({
      id: mockSourceId as string,
      name: 'Budget Data 2026.pdf',
    });

    mockFindSkillByName.execute.mockResolvedValue(skill);
    mockFindThread.execute.mockResolvedValue({
      thread,
      isLongChat: false,
    });
    mockGetSourcesByIds.execute.mockResolvedValue([source]);

    const tool = createMockTool('Budget Analysis');

    await handler.execute({
      tool,
      input: { skill_name: 'Budget Analysis' },
      context: { threadId: mockThreadId, orgId: randomUUID() },
    });

    expect(mockAddSourceToThread.execute).toHaveBeenCalledTimes(1);
    const command = mockAddSourceToThread.execute.mock.calls[0][0];
    expect(command.thread).toBe(thread);
    expect(command.source).toBe(source);
    expect(command.originSkillId).toBe(mockSkillId);
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

  it('should return the skill instructions on success', async () => {
    const instructions = 'You are a zoning compliance assistant.';
    const skill = createMockSkill({
      instructions,
      sourceIds: [],
      mcpIntegrationIds: [],
    });

    const thread = new Thread({
      userId: randomUUID(),
      messages: [],
    });

    mockFindSkillByName.execute.mockResolvedValue(skill);
    mockFindThread.execute.mockResolvedValue({
      thread,
      isLongChat: false,
    });
    mockGetSourcesByIds.execute.mockResolvedValue([]);

    const tool = createMockTool('Budget Analysis');

    const result = await handler.execute({
      tool,
      input: { skill_name: 'Budget Analysis' },
      context: { threadId: mockThreadId, orgId: randomUUID() },
    });

    expect(result).toBe(instructions);
  });
});
