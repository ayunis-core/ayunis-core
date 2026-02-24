import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { RemoveKnowledgeBaseFromThreadUseCase } from './remove-knowledge-base-from-thread.use-case';
import { RemoveKnowledgeBaseFromThreadCommand } from './remove-knowledge-base-from-thread.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Thread } from '../../../domain/thread.entity';
import { ThreadNotFoundError } from '../../threads.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';

describe('RemoveKnowledgeBaseFromThreadUseCase', () => {
  let useCase: RemoveKnowledgeBaseFromThreadUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let mockContextService: { get: jest.Mock };

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockThreadId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockKbId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const mockKbId2 = '123e4567-e89b-12d3-a456-426614174003' as UUID;

  beforeAll(async () => {
    const mockThreadsRepository = {
      findOne: jest.fn(),
      updateKnowledgeBases: jest.fn(),
    };

    mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemoveKnowledgeBaseFromThreadUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get(RemoveKnowledgeBaseFromThreadUseCase);
    threadsRepository = module.get(ThreadsRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should remove a knowledge base from a thread', async () => {
    const thread = new Thread({
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      knowledgeBases: [
        { id: mockKbId, name: 'Municipal Zoning Guidelines' },
        { id: mockKbId2, name: 'Building Permits Documentation' },
      ],
    });

    threadsRepository.findOne.mockResolvedValue(thread);
    threadsRepository.updateKnowledgeBases.mockResolvedValue(undefined);

    const command = new RemoveKnowledgeBaseFromThreadCommand(
      mockThreadId,
      mockKbId,
    );

    await useCase.execute(command);

    expect(threadsRepository.updateKnowledgeBases).toHaveBeenCalledWith({
      threadId: mockThreadId,
      userId: mockUserId,
      knowledgeBaseIds: [mockKbId2],
    });
  });

  it('should result in empty array when removing the last knowledge base', async () => {
    const thread = new Thread({
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      knowledgeBases: [{ id: mockKbId, name: 'Municipal Zoning Guidelines' }],
    });

    threadsRepository.findOne.mockResolvedValue(thread);
    threadsRepository.updateKnowledgeBases.mockResolvedValue(undefined);

    const command = new RemoveKnowledgeBaseFromThreadCommand(
      mockThreadId,
      mockKbId,
    );

    await useCase.execute(command);

    expect(threadsRepository.updateKnowledgeBases).toHaveBeenCalledWith({
      threadId: mockThreadId,
      userId: mockUserId,
      knowledgeBaseIds: [],
    });
  });

  it('should return early without updating when removing a non-assigned knowledge base', async () => {
    const thread = new Thread({
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      knowledgeBases: [{ id: mockKbId, name: 'Municipal Zoning Guidelines' }],
    });

    threadsRepository.findOne.mockResolvedValue(thread);

    const command = new RemoveKnowledgeBaseFromThreadCommand(
      mockThreadId,
      mockKbId2,
    );

    await useCase.execute(command);

    expect(threadsRepository.updateKnowledgeBases).not.toHaveBeenCalled();
  });

  it('should throw ThreadNotFoundError when thread does not exist', async () => {
    threadsRepository.findOne.mockResolvedValue(null);

    const command = new RemoveKnowledgeBaseFromThreadCommand(
      mockThreadId,
      mockKbId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(ThreadNotFoundError);
  });

  it('should throw UnauthorizedAccessError when userId is not set in context', async () => {
    mockContextService.get.mockReturnValue(undefined);

    const command = new RemoveKnowledgeBaseFromThreadCommand(
      mockThreadId,
      mockKbId,
    );

    await expect(useCase.execute(command)).rejects.toThrow(
      UnauthorizedAccessError,
    );
    expect(threadsRepository.findOne).not.toHaveBeenCalled();
  });
});
