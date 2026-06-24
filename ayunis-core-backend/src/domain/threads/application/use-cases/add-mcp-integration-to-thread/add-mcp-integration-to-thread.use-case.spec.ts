import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AddMcpIntegrationToThreadUseCase } from './add-mcp-integration-to-thread.use-case';
import { AddMcpIntegrationToThreadCommand } from './add-mcp-integration-to-thread.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Thread } from '../../../domain/thread.entity';
import { ThreadNotFoundError } from '../../threads.errors';
import { GetMcpIntegrationsByIdsUseCase } from 'src/domain/mcp/application/use-cases/get-mcp-integrations-by-ids/get-mcp-integrations-by-ids.use-case';
import { McpIntegrationNotFoundError } from 'src/domain/mcp/application/mcp.errors';
import type { McpIntegration } from 'src/domain/mcp/domain/mcp-integration.entity';
import type { UUID } from 'crypto';

describe('AddMcpIntegrationToThreadUseCase', () => {
  let useCase: AddMcpIntegrationToThreadUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let getMcpIntegrationsByIdsUseCase: jest.Mocked<GetMcpIntegrationsByIdsUseCase>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockThreadId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockMcpIntegrationId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const mockMcpIntegrationId2 = '123e4567-e89b-12d3-a456-426614174003' as UUID;

  const mockIntegration = (id: UUID): McpIntegration =>
    ({ id }) as McpIntegration;

  beforeAll(async () => {
    const mockThreadsRepository = {
      findOne: jest.fn(),
      updateMcpIntegrations: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const mockGetMcpIntegrationsByIdsUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddMcpIntegrationToThreadUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
        { provide: ContextService, useValue: mockContextService },
        {
          provide: GetMcpIntegrationsByIdsUseCase,
          useValue: mockGetMcpIntegrationsByIdsUseCase,
        },
      ],
    }).compile();

    useCase = module.get(AddMcpIntegrationToThreadUseCase);
    threadsRepository = module.get(ThreadsRepository);
    getMcpIntegrationsByIdsUseCase = module.get(GetMcpIntegrationsByIdsUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add an MCP integration to a thread with no existing integrations', async () => {
    const thread = new Thread({
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      mcpIntegrationIds: [],
    });

    threadsRepository.findOne.mockResolvedValue(thread);
    threadsRepository.updateMcpIntegrations.mockResolvedValue(undefined);
    getMcpIntegrationsByIdsUseCase.execute.mockResolvedValue([
      mockIntegration(mockMcpIntegrationId),
    ]);

    const command = new AddMcpIntegrationToThreadCommand(
      mockThreadId,
      mockMcpIntegrationId,
    );

    await useCase.execute(command);

    expect(threadsRepository.updateMcpIntegrations).toHaveBeenCalledWith({
      threadId: mockThreadId,
      userId: mockUserId,
      mcpIntegrationIds: [mockMcpIntegrationId],
    });
  });

  it('should append an MCP integration to a thread with existing integrations', async () => {
    const thread = new Thread({
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      mcpIntegrationIds: [mockMcpIntegrationId],
    });

    threadsRepository.findOne.mockResolvedValue(thread);
    threadsRepository.updateMcpIntegrations.mockResolvedValue(undefined);
    getMcpIntegrationsByIdsUseCase.execute.mockResolvedValue([
      mockIntegration(mockMcpIntegrationId2),
    ]);

    const command = new AddMcpIntegrationToThreadCommand(
      mockThreadId,
      mockMcpIntegrationId2,
    );

    await useCase.execute(command);

    expect(threadsRepository.updateMcpIntegrations).toHaveBeenCalledWith({
      threadId: mockThreadId,
      userId: mockUserId,
      mcpIntegrationIds: [mockMcpIntegrationId, mockMcpIntegrationId2],
    });
  });

  it('should not duplicate an MCP integration that is already assigned', async () => {
    const thread = new Thread({
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      mcpIntegrationIds: [mockMcpIntegrationId],
    });

    threadsRepository.findOne.mockResolvedValue(thread);
    threadsRepository.updateMcpIntegrations.mockResolvedValue(undefined);

    const command = new AddMcpIntegrationToThreadCommand(
      mockThreadId,
      mockMcpIntegrationId,
    );

    await useCase.execute(command);

    expect(threadsRepository.updateMcpIntegrations).not.toHaveBeenCalled();
  });

  it('should throw ThreadNotFoundError when thread does not exist', async () => {
    threadsRepository.findOne.mockResolvedValue(null);

    const command = new AddMcpIntegrationToThreadCommand(
      mockThreadId,
      mockMcpIntegrationId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(ThreadNotFoundError);
  });

  it('should throw McpIntegrationNotFoundError when the integration does not exist', async () => {
    const thread = new Thread({
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      mcpIntegrationIds: [],
    });

    threadsRepository.findOne.mockResolvedValue(thread);
    getMcpIntegrationsByIdsUseCase.execute.mockResolvedValue([]);

    const command = new AddMcpIntegrationToThreadCommand(
      mockThreadId,
      mockMcpIntegrationId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      McpIntegrationNotFoundError,
    );
    expect(threadsRepository.updateMcpIntegrations).not.toHaveBeenCalled();
  });

  it('should not validate the integration when it is already assigned', async () => {
    const thread = new Thread({
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      mcpIntegrationIds: [mockMcpIntegrationId],
    });

    threadsRepository.findOne.mockResolvedValue(thread);

    const command = new AddMcpIntegrationToThreadCommand(
      mockThreadId,
      mockMcpIntegrationId,
    );

    await useCase.execute(command);

    expect(getMcpIntegrationsByIdsUseCase.execute).not.toHaveBeenCalled();
    expect(threadsRepository.updateMcpIntegrations).not.toHaveBeenCalled();
  });
});
