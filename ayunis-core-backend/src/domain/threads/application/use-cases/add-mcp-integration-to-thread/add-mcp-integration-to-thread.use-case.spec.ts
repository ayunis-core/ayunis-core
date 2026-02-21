import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AddMcpIntegrationToThreadUseCase } from './add-mcp-integration-to-thread.use-case';
import { AddMcpIntegrationToThreadCommand } from './add-mcp-integration-to-thread.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Thread } from '../../../domain/thread.entity';
import { ThreadNotFoundError } from '../../threads.errors';
import type { UUID } from 'crypto';

describe('AddMcpIntegrationToThreadUseCase', () => {
  let useCase: AddMcpIntegrationToThreadUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockThreadId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockMcpIntegrationId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const mockMcpIntegrationId2 = '123e4567-e89b-12d3-a456-426614174003' as UUID;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddMcpIntegrationToThreadUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get(AddMcpIntegrationToThreadUseCase);
    threadsRepository = module.get(ThreadsRepository);

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
});
