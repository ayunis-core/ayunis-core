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

  it('loads only owner-scoped citation assignment data in one query', async () => {
    const citationContext = {
      userId: randomUUID(),
      workspaceId: randomUUID(),
      sourceAssignments: [
        { sourceId: randomUUID(), originSkillId: randomUUID() },
      ],
      knowledgeBaseAssignments: [
        { knowledgeBaseId: randomUUID(), originSkillId: null },
      ],
    };
    const threadRepository = {
      query: jest.fn().mockResolvedValue([citationContext]),
    } as unknown as jest.Mocked<Repository<ThreadRecord>>;
    const repository = new LocalThreadsRepository(
      threadRepository,
      {} as ThreadMapper,
      {} as LocalThreadAssignmentsRepository,
    );
    const threadId = randomUUID();

    await expect(
      repository.findCitationContext(threadId, citationContext.userId),
    ).resolves.toBe(citationContext);
    expect(threadRepository.query).toHaveBeenCalledTimes(1);
    expect(threadRepository.query).toHaveBeenCalledWith(
      expect.not.stringContaining('messages'),
      [threadId, citationContext.userId],
    );
    expect(threadRepository.query).toHaveBeenCalledWith(
      expect.stringMatching(
        /thread_source_assignments[\s\S]+thread_knowledge_base_assignments/,
      ),
      [threadId, citationContext.userId],
    );
  });

  it('returns null when no owner-scoped citation context exists', async () => {
    const threadRepository = {
      query: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<Repository<ThreadRecord>>;
    const repository = new LocalThreadsRepository(
      threadRepository,
      {} as ThreadMapper,
      {} as LocalThreadAssignmentsRepository,
    );

    await expect(
      repository.findCitationContext(randomUUID(), randomUUID()),
    ).resolves.toBeNull();
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
});
