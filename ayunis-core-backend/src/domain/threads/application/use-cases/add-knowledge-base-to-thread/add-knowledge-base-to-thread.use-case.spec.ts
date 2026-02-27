import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AddKnowledgeBaseToThreadUseCase } from './add-knowledge-base-to-thread.use-case';
import { AddKnowledgeBaseToThreadCommand } from './add-knowledge-base-to-thread.command';
import { ThreadsRepository } from '../../ports/threads.repository';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { Thread } from '../../../domain/thread.entity';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { KnowledgeBaseAssignment } from '../../../domain/thread-knowledge-base-assignment.entity';
import { ThreadNotFoundError } from '../../threads.errors';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';

describe('AddKnowledgeBaseToThreadUseCase', () => {
  let useCase: AddKnowledgeBaseToThreadUseCase;
  let threadsRepository: jest.Mocked<ThreadsRepository>;
  let knowledgeBaseRepository: jest.Mocked<KnowledgeBaseRepository>;
  let mockContextService: { get: jest.Mock };

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockOrgId = '123e4567-e89b-12d3-a456-426614174010' as UUID;
  const mockOtherOrgId = '123e4567-e89b-12d3-a456-426614174099' as UUID;
  const mockThreadId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockKbId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const mockSkillId = '123e4567-e89b-12d3-a456-426614174050' as UUID;

  beforeAll(async () => {
    const mockThreadsRepository = {
      findOne: jest.fn(),
      addKnowledgeBaseAssignment: jest.fn(),
    };

    const mockKnowledgeBaseRepository = {
      findById: jest.fn(),
    };

    mockContextService = {
      get: jest.fn((key: string) => {
        if (key === 'userId') return mockUserId;
        if (key === 'orgId') return mockOrgId;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddKnowledgeBaseToThreadUseCase,
        { provide: ThreadsRepository, useValue: mockThreadsRepository },
        {
          provide: KnowledgeBaseRepository,
          useValue: mockKnowledgeBaseRepository,
        },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get(AddKnowledgeBaseToThreadUseCase);
    threadsRepository = module.get(ThreadsRepository);
    knowledgeBaseRepository = module.get(KnowledgeBaseRepository);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should add a knowledge base to a thread with no existing assignments', async () => {
    const thread = new Thread({
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      knowledgeBaseAssignments: [],
    });

    const knowledgeBase = new KnowledgeBase({
      id: mockKbId,
      name: 'Municipal Zoning Guidelines',
      orgId: mockOrgId,
      userId: mockUserId,
    });

    threadsRepository.findOne.mockResolvedValue(thread);
    knowledgeBaseRepository.findById.mockResolvedValue(knowledgeBase);
    threadsRepository.addKnowledgeBaseAssignment.mockResolvedValue(undefined);

    const command = new AddKnowledgeBaseToThreadCommand(mockThreadId, mockKbId);

    await useCase.execute(command);

    expect(threadsRepository.addKnowledgeBaseAssignment).toHaveBeenCalledWith({
      threadId: mockThreadId,
      userId: mockUserId,
      knowledgeBaseId: mockKbId,
      originSkillId: undefined,
    });
  });

  it('should pass originSkillId when provided', async () => {
    const thread = new Thread({
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      knowledgeBaseAssignments: [],
    });

    const knowledgeBase = new KnowledgeBase({
      id: mockKbId,
      name: 'Municipal Zoning Guidelines',
      orgId: mockOrgId,
      userId: mockUserId,
    });

    threadsRepository.findOne.mockResolvedValue(thread);
    knowledgeBaseRepository.findById.mockResolvedValue(knowledgeBase);
    threadsRepository.addKnowledgeBaseAssignment.mockResolvedValue(undefined);

    const command = new AddKnowledgeBaseToThreadCommand(
      mockThreadId,
      mockKbId,
      mockSkillId,
    );

    await useCase.execute(command);

    expect(threadsRepository.addKnowledgeBaseAssignment).toHaveBeenCalledWith({
      threadId: mockThreadId,
      userId: mockUserId,
      knowledgeBaseId: mockKbId,
      originSkillId: mockSkillId,
    });
  });

  it('should not duplicate a knowledge base that is already assigned', async () => {
    const thread = new Thread({
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      knowledgeBaseAssignments: [
        new KnowledgeBaseAssignment({
          knowledgeBase: { id: mockKbId, name: 'Municipal Zoning Guidelines' },
        }),
      ],
    });

    const knowledgeBase = new KnowledgeBase({
      id: mockKbId,
      name: 'Municipal Zoning Guidelines',
      orgId: mockOrgId,
      userId: mockUserId,
    });

    threadsRepository.findOne.mockResolvedValue(thread);
    knowledgeBaseRepository.findById.mockResolvedValue(knowledgeBase);

    const command = new AddKnowledgeBaseToThreadCommand(mockThreadId, mockKbId);

    await useCase.execute(command);

    expect(threadsRepository.addKnowledgeBaseAssignment).not.toHaveBeenCalled();
  });

  it('should throw ThreadNotFoundError when thread does not exist', async () => {
    threadsRepository.findOne.mockResolvedValue(null);

    const command = new AddKnowledgeBaseToThreadCommand(mockThreadId, mockKbId);

    await expect(useCase.execute(command)).rejects.toThrow(ThreadNotFoundError);
  });

  it('should throw KnowledgeBaseNotFoundError when knowledge base does not exist', async () => {
    const thread = new Thread({
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      knowledgeBaseAssignments: [],
    });

    threadsRepository.findOne.mockResolvedValue(thread);
    knowledgeBaseRepository.findById.mockResolvedValue(null);

    const command = new AddKnowledgeBaseToThreadCommand(mockThreadId, mockKbId);

    await expect(useCase.execute(command)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
  });

  it('should throw KnowledgeBaseNotFoundError when knowledge base belongs to a different org', async () => {
    const thread = new Thread({
      id: mockThreadId,
      userId: mockUserId,
      messages: [],
      knowledgeBaseAssignments: [],
    });

    const foreignKnowledgeBase = new KnowledgeBase({
      id: mockKbId,
      name: 'Foreign Org Knowledge Base',
      orgId: mockOtherOrgId,
      userId: mockUserId,
    });

    threadsRepository.findOne.mockResolvedValue(thread);
    knowledgeBaseRepository.findById.mockResolvedValue(foreignKnowledgeBase);

    const command = new AddKnowledgeBaseToThreadCommand(mockThreadId, mockKbId);

    await expect(useCase.execute(command)).rejects.toThrow(
      KnowledgeBaseNotFoundError,
    );
    expect(threadsRepository.addKnowledgeBaseAssignment).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedAccessError when userId is not set in context', async () => {
    mockContextService.get.mockReturnValue(undefined);

    const command = new AddKnowledgeBaseToThreadCommand(mockThreadId, mockKbId);

    await expect(useCase.execute(command)).rejects.toThrow(
      UnauthorizedAccessError,
    );
    expect(threadsRepository.findOne).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedAccessError when orgId is not set in context', async () => {
    mockContextService.get.mockImplementation((key: string) => {
      if (key === 'userId') return mockUserId;
      return undefined;
    });

    const command = new AddKnowledgeBaseToThreadCommand(mockThreadId, mockKbId);

    await expect(useCase.execute(command)).rejects.toThrow(
      UnauthorizedAccessError,
    );
    expect(threadsRepository.findOne).not.toHaveBeenCalled();
  });
});
