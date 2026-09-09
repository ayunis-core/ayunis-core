import { randomUUID } from 'crypto';
import type { Repository } from 'typeorm';

import { LocalThreadsRepository } from './local-threads.repository';
import type { LocalThreadAssignmentsRepository } from './local-thread-assignments.repository';
import type { ThreadMapper } from './mappers/thread.mapper';
import type { ThreadRecord } from './schema/thread.record';

describe('LocalThreadsRepository', () => {
  it('loads source assignments separately from the other thread relations', async () => {
    const threadRecord = { messages: [] } as unknown as ThreadRecord;
    const sourceAssignments = [{ id: randomUUID() }];
    const threadRepository = {
      findOne: jest.fn().mockResolvedValue(threadRecord),
    } as unknown as jest.Mocked<Repository<ThreadRecord>>;
    const threadMapper = {
      toDomain: jest.fn().mockReturnValue({}),
    } as unknown as ThreadMapper;
    const assignments = {
      findSourceAssignmentsByThreadId: jest
        .fn()
        .mockResolvedValue(sourceAssignments),
    } as unknown as LocalThreadAssignmentsRepository;
    const repository = new LocalThreadsRepository(
      threadRepository,
      threadMapper,
      assignments,
    );
    const threadId = randomUUID();
    const userId = randomUUID();

    await repository.findOne(threadId, userId);

    expect(threadRepository.findOne).toHaveBeenCalledWith({
      where: { id: threadId, userId },
      relationLoadStrategy: 'query',
      relations: [
        'messages',
        'model',
        'knowledgeBaseAssignments',
        'knowledgeBaseAssignments.knowledgeBase',
        'mcpIntegrations',
      ],
    });
    expect(assignments.findSourceAssignmentsByThreadId).toHaveBeenCalledWith(
      threadId,
    );
    expect(threadMapper.toDomain).toHaveBeenCalledWith(
      expect.objectContaining({ sourceAssignments }),
    );
  });

  it('returns messages in chronological order', async () => {
    const olderMessage = {
      createdAt: new Date('2026-08-10T08:00:00Z'),
    };
    const newerMessage = {
      createdAt: new Date('2026-08-10T09:00:00Z'),
    };
    const threadRepository = {
      findOne: jest.fn().mockResolvedValue({
        messages: [newerMessage, olderMessage],
      }),
    } as unknown as jest.Mocked<Repository<ThreadRecord>>;
    const threadMapper = {
      toDomain: jest.fn().mockImplementation((record: ThreadRecord) => ({
        messages: record.messages,
      })),
    } as unknown as ThreadMapper;
    const assignments = {
      findSourceAssignmentsByThreadId: jest.fn().mockResolvedValue([]),
    } as unknown as LocalThreadAssignmentsRepository;
    const repository = new LocalThreadsRepository(
      threadRepository,
      threadMapper,
      assignments,
    );

    const thread = await repository.findOne(randomUUID(), randomUUID());

    expect(thread?.messages).toEqual([olderMessage, newerMessage]);
  });

  it('loads owner-scoped context references without hydrating the thread', async () => {
    const threadId = randomUUID();
    const userId = randomUUID();
    const workspaceId = randomUUID();
    const knowledgeBaseId = randomUUID();
    const queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { workspaceId, knowledgeBaseId },
        { workspaceId, knowledgeBaseId: null },
      ]),
    };
    const threadRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as jest.Mocked<Repository<ThreadRecord>>;
    const repository = new LocalThreadsRepository(
      threadRepository,
      {} as ThreadMapper,
      {} as LocalThreadAssignmentsRepository,
    );

    await expect(repository.findContextRefs(threadId, userId)).resolves.toEqual(
      {
        workspaceId,
        knowledgeBaseIds: [knowledgeBaseId],
      },
    );
    expect(queryBuilder.where).toHaveBeenCalledWith('thread.id = :id', {
      id: threadId,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'thread.userId = :userId',
      { userId },
    );
  });
});
