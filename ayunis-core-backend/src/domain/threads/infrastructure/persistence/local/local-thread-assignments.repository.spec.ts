import { randomUUID, type UUID } from 'crypto';
import type { Repository } from 'typeorm';

import { LocalThreadAssignmentsRepository } from './local-thread-assignments.repository';
import type { ThreadRecord } from './schema/thread.record';
import { ThreadSourceAssignmentRecord } from './schema/thread-source-assignment.record';
import type { ThreadKnowledgeBaseAssignmentRecord } from './schema/thread-knowledge-base-assignment.record';
import type { ThreadSourceAssignmentMapper } from './mappers/thread-source-assignment.mapper';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import { SourceAssignment } from 'src/domain/threads/domain/thread-source-assignment.entity';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';

class ConcreteSource extends Source {
  constructor(params: { id?: UUID; name: string }) {
    super({ id: params.id, type: SourceType.TEXT, name: params.name });
  }
}

function makeAssignmentRecord(
  threadId: UUID,
  sourceId: UUID,
): ThreadSourceAssignmentRecord {
  const record = new ThreadSourceAssignmentRecord();
  record.id = randomUUID();
  record.threadId = threadId;
  record.sourceId = sourceId;
  record.originSkillId = null;
  record.createdAt = new Date('2026-04-14T00:00:00Z');
  record.updatedAt = new Date('2026-04-14T00:00:00Z');
  return record;
}

describe('LocalThreadAssignmentsRepository', () => {
  let repository: LocalThreadAssignmentsRepository;
  let threadRepo: jest.Mocked<
    Pick<Repository<ThreadRecord>, 'findOne' | 'exists'>
  >;
  let sourceAssignmentRepo: jest.Mocked<
    Pick<Repository<ThreadSourceAssignmentRecord>, 'save'>
  >;
  let kbAssignmentRepo: jest.Mocked<
    Repository<ThreadKnowledgeBaseAssignmentRecord>
  >;
  let mapper: jest.Mocked<Pick<ThreadSourceAssignmentMapper, 'toRecord'>> &
    ThreadSourceAssignmentMapper;

  const userId = randomUUID();
  const threadId = randomUUID();

  beforeEach(() => {
    threadRepo = {
      findOne: jest.fn(),
      exists: jest.fn(),
    };
    sourceAssignmentRepo = {
      save: jest.fn(),
    };
    kbAssignmentRepo = {} as jest.Mocked<
      Repository<ThreadKnowledgeBaseAssignmentRecord>
    >;
    mapper = {
      toRecord: jest
        .fn()
        .mockImplementation((assignment: SourceAssignment, tid: UUID) => {
          const record = new ThreadSourceAssignmentRecord();
          record.id = assignment.id;
          record.threadId = tid;
          record.sourceId = assignment.source.id;
          record.originSkillId = assignment.originSkillId ?? null;
          record.createdAt = assignment.createdAt;
          record.updatedAt = assignment.updatedAt;
          return record;
        }),
    } as unknown as jest.Mocked<
      Pick<ThreadSourceAssignmentMapper, 'toRecord'>
    > &
      ThreadSourceAssignmentMapper;

    repository = new LocalThreadAssignmentsRepository(
      threadRepo as unknown as Repository<ThreadRecord>,
      sourceAssignmentRepo as unknown as Repository<ThreadSourceAssignmentRecord>,
      kbAssignmentRepo,
      mapper,
    );
  });

  describe('addSourceAssignment', () => {
    it('inserts exactly the new assignment', async () => {
      const source = new ConcreteSource({ name: 'new.pdf' });
      threadRepo.exists.mockResolvedValue(true);
      const assignment = new SourceAssignment({ source });

      await repository.addSourceAssignment({
        threadId,
        userId,
        sourceAssignment: assignment,
      });

      expect(mapper.toRecord).toHaveBeenCalledTimes(1);
      expect(mapper.toRecord).toHaveBeenCalledWith(assignment, threadId);
      expect(sourceAssignmentRepo.save).toHaveBeenCalledTimes(1);
      const inserted = sourceAssignmentRepo.save.mock
        .calls[0][0] as ThreadSourceAssignmentRecord;
      expect(inserted.sourceId).toBe(source.id);
      expect(inserted.threadId).toBe(threadId);
    });

    // Regression for AYC-551: the previous full-set-replace write re-derived
    // the diff from a second read, so a row deleted between the two reads was
    // re-INSERTed with its original primary key and raised a 23505.
    it('never writes assignments other than the one being added', async () => {
      const existingSource = new ConcreteSource({ name: 'existing.pdf' });
      const existingRecord = makeAssignmentRecord(threadId, existingSource.id);
      threadRepo.exists.mockResolvedValue(true);

      await repository.addSourceAssignment({
        threadId,
        userId,
        sourceAssignment: new SourceAssignment({
          source: new ConcreteSource({ name: 'new.pdf' }),
        }),
      });

      const inserted = sourceAssignmentRepo.save.mock
        .calls[0][0] as ThreadSourceAssignmentRecord;
      expect(inserted.id).not.toBe(existingRecord.id);
      expect(sourceAssignmentRepo.save).toHaveBeenCalledTimes(1);
      expect(threadRepo.findOne).not.toHaveBeenCalled();
    });

    it('throws ThreadNotFoundError when the thread does not exist', async () => {
      threadRepo.exists.mockResolvedValue(false);

      await expect(
        repository.addSourceAssignment({
          threadId,
          userId,
          sourceAssignment: new SourceAssignment({
            source: new ConcreteSource({ name: 'new.pdf' }),
          }),
        }),
      ).rejects.toBeInstanceOf(ThreadNotFoundError);
      expect(sourceAssignmentRepo.save).not.toHaveBeenCalled();
    });

    it('scopes the ownership check to the requesting user', async () => {
      threadRepo.exists.mockResolvedValue(true);

      await repository.addSourceAssignment({
        threadId,
        userId,
        sourceAssignment: new SourceAssignment({
          source: new ConcreteSource({ name: 'new.pdf' }),
        }),
      });

      expect(threadRepo.exists).toHaveBeenCalledWith({
        where: { id: threadId, userId },
      });
    });
  });
});
