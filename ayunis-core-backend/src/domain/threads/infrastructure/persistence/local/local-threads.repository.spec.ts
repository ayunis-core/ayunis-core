import { randomUUID } from 'crypto';
import type { Repository } from 'typeorm';

import { LocalThreadsRepository } from './local-threads.repository';
import type { LocalThreadAssignmentsRepository } from './local-thread-assignments.repository';
import type { ThreadMapper } from './mappers/thread.mapper';
import type { ThreadRecord } from './schema/thread.record';

describe('LocalThreadsRepository', () => {
  it('loads the complete thread graph with separate queries', async () => {
    const threadRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<Repository<ThreadRecord>>;
    const repository = new LocalThreadsRepository(
      threadRepository,
      {} as ThreadMapper,
      {} as LocalThreadAssignmentsRepository,
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
        'sourceAssignments',
        'sourceAssignments.source',
        'sourceAssignments.source.dataSourceDetails',
        'knowledgeBaseAssignments',
        'knowledgeBaseAssignments.knowledgeBase',
        'mcpIntegrations',
      ],
    });
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
    const repository = new LocalThreadsRepository(
      threadRepository,
      threadMapper,
      {} as LocalThreadAssignmentsRepository,
    );

    const thread = await repository.findOne(randomUUID(), randomUUID());

    expect(thread?.messages).toEqual([olderMessage, newerMessage]);
  });
});
