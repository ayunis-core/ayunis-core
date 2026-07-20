import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RemoveMcpIntegrationFromThreadUseCase } from './remove-mcp-integration-from-thread.use-case';
import { RemoveMcpIntegrationFromThreadCommand } from './remove-mcp-integration-from-thread.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ThreadNotFoundError } from '../../threads.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';

describe('RemoveMcpIntegrationFromThreadUseCase', () => {
  let useCase: RemoveMcpIntegrationFromThreadUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let mockContextService: { get: jest.Mock };

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockThreadId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockMcpIntegrationId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const mockMcpIntegrationId2 = '123e4567-e89b-12d3-a456-426614174003' as UUID;

  beforeAll(async () => {
    const mockThreadsRepository = {
      findOne: jest.fn(),
      updateMcpIntegrations: jest.fn(),
    };

    mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveMcpIntegrationFromThreadUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get(RemoveMcpIntegrationFromThreadUseCase);
    threadsRepository = module.get(ThreadsRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should remove an MCP integration from a thread', async () => {
    const thread = new Thread({
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      mcpIntegrationIds: [mockMcpIntegrationId, mockMcpIntegrationId2],
    });

    threadsRepository.findOne.mockResolvedValue(thread);
    threadsRepository.updateMcpIntegrations.mockResolvedValue(undefined);

    const command = new RemoveMcpIntegrationFromThreadCommand(
      mockThreadId,
      mockMcpIntegrationId,
    );

    await useCase.execute(command);

    expect(threadsRepository.updateMcpIntegrations).toHaveBeenCalledWith({
      threadId: mockThreadId,
      userId: mockUserId,
      mcpIntegrationIds: [mockMcpIntegrationId2],
    });
  });

  it('should be a no-op when the integration is not assigned to the thread', async () => {
    const thread = new Thread({
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      mcpIntegrationIds: [mockMcpIntegrationId2],
    });

    threadsRepository.findOne.mockResolvedValue(thread);

    const command = new RemoveMcpIntegrationFromThreadCommand(
      mockThreadId,
      mockMcpIntegrationId,
    );

    await useCase.execute(command);

    expect(threadsRepository.updateMcpIntegrations).not.toHaveBeenCalled();
  });

  it('should throw ThreadNotFoundError when thread does not exist', async () => {
    threadsRepository.findOne.mockResolvedValue(null);

    const command = new RemoveMcpIntegrationFromThreadCommand(
      mockThreadId,
      mockMcpIntegrationId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(ThreadNotFoundError);
  });

  it('should throw UnauthorizedAccessError when there is no user context', async () => {
    mockContextService.get.mockReturnValueOnce(undefined);

    const command = new RemoveMcpIntegrationFromThreadCommand(
      mockThreadId,
      mockMcpIntegrationId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      UnauthorizedAccessError,
    );
  });
});
