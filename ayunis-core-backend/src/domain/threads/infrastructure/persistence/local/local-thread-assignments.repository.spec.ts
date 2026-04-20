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
  let threadRepo: jest.Mocked<Pick<Repository<ThreadRecord>, 'findOne'>>;
  let sourceAssignmentRepo: jest.Mocked<
    Pick<Repository<ThreadSourceAssignmentRecord>, 'remove' | 'save'>
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
    } as jest.Mocked<Pick<Repository<ThreadRecord>, 'findOne'>>;
    sourceAssignmentRepo = {
      remove: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<
      Pick<Repository<ThreadSourceAssignmentRecord>, 'remove' | 'save'>
    >;
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

  describe('updateSourceAssignments', () => {
    it('inserts only the new assignment when adding to an existing list', async () => {
      const existingSource = new ConcreteSource({ name: 'existing.pdf' });
      const existingRecord = makeAssignmentRecord(threadId, existingSource.id);
      const newSource = new ConcreteSource({ name: 'new.pdf' });

      threadRepo.findOne.mockResolvedValue({
        id: threadId,
        userId,
        sourceAssignments: [existingRecord],
      } as ThreadRecord);

      await repository.updateSourceAssignments({
        threadId,
        userId,
        sourceAssignments: [
          new SourceAssignment({
            id: existingRecord.id,
            source: existingSource,
            createdAt: existingRecord.createdAt,
            updatedAt: existingRecord.updatedAt,
          }),
          new SourceAssignment({ source: newSource }),
        ],
      });

      expect(sourceAssignmentRepo.remove).not.toHaveBeenCalled();
      expect(mapper.toRecord).toHaveBeenCalledTimes(1);
      expect(mapper.toRecord).toHaveBeenCalledWith(
        expect.objectContaining({ source: newSource }),
        threadId,
      );
      expect(sourceAssignmentRepo.save).toHaveBeenCalledTimes(1);
      const savedRecords = sourceAssignmentRepo.save.mock
        .calls[0][0] as ThreadSourceAssignmentRecord[];
      expect(savedRecords).toHaveLength(1);
      expect(savedRecords[0].sourceId).toBe(newSource.id);
    });

    it('removes stale assignments and does not re-insert survivors', async () => {
      const keptSource = new ConcreteSource({ name: 'kept.pdf' });
      const droppedSource = new ConcreteSource({ name: 'dropped.pdf' });
      const keptRecord = makeAssignmentRecord(threadId, keptSource.id);
      const droppedRecord = makeAssignmentRecord(threadId, droppedSource.id);

      threadRepo.findOne.mockResolvedValue({
        id: threadId,
        userId,
        sourceAssignments: [keptRecord, droppedRecord],
      } as ThreadRecord);

      await repository.updateSourceAssignments({
        threadId,
        userId,
        sourceAssignments: [
          new SourceAssignment({
            id: keptRecord.id,
            source: keptSource,
            createdAt: keptRecord.createdAt,
            updatedAt: keptRecord.updatedAt,
          }),
        ],
      });

      expect(sourceAssignmentRepo.remove).toHaveBeenCalledTimes(1);
      expect(sourceAssignmentRepo.remove).toHaveBeenCalledWith([droppedRecord]);
      expect(mapper.toRecord).not.toHaveBeenCalled();
      expect(sourceAssignmentRepo.save).not.toHaveBeenCalled();
    });

    it('no-ops when target list matches the existing assignments', async () => {
      const source = new ConcreteSource({ name: 'same.pdf' });
      const record = makeAssignmentRecord(threadId, source.id);

      threadRepo.findOne.mockResolvedValue({
        id: threadId,
        userId,
        sourceAssignments: [record],
      } as ThreadRecord);

      await repository.updateSourceAssignments({
        threadId,
        userId,
        sourceAssignments: [
          new SourceAssignment({
            id: record.id,
            source,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          }),
        ],
      });

      expect(sourceAssignmentRepo.remove).not.toHaveBeenCalled();
      expect(mapper.toRecord).not.toHaveBeenCalled();
      expect(sourceAssignmentRepo.save).not.toHaveBeenCalled();
    });

    it('handles mixed add and remove in one call', async () => {
      const keptSource = new ConcreteSource({ name: 'kept.pdf' });
      const droppedSource = new ConcreteSource({ name: 'dropped.pdf' });
      const addedSource = new ConcreteSource({ name: 'added.pdf' });
      const keptRecord = makeAssignmentRecord(threadId, keptSource.id);
      const droppedRecord = makeAssignmentRecord(threadId, droppedSource.id);

      threadRepo.findOne.mockResolvedValue({
        id: threadId,
        userId,
        sourceAssignments: [keptRecord, droppedRecord],
      } as ThreadRecord);

      await repository.updateSourceAssignments({
        threadId,
        userId,
        sourceAssignments: [
          new SourceAssignment({
            id: keptRecord.id,
            source: keptSource,
            createdAt: keptRecord.createdAt,
            updatedAt: keptRecord.updatedAt,
          }),
          new SourceAssignment({ source: addedSource }),
        ],
      });

      expect(sourceAssignmentRepo.remove).toHaveBeenCalledWith([droppedRecord]);
      expect(mapper.toRecord).toHaveBeenCalledTimes(1);
      expect(mapper.toRecord).toHaveBeenCalledWith(
        expect.objectContaining({ source: addedSource }),
        threadId,
      );
      const savedRecords = sourceAssignmentRepo.save.mock
        .calls[0][0] as ThreadSourceAssignmentRecord[];
      expect(savedRecords).toHaveLength(1);
      expect(savedRecords[0].sourceId).toBe(addedSource.id);
    });

    it('throws ThreadNotFoundError when the thread does not exist', async () => {
      threadRepo.findOne.mockResolvedValue(null);

      await expect(
        repository.updateSourceAssignments({
          threadId,
          userId,
          sourceAssignments: [],
        }),
      ).rejects.toBeInstanceOf(ThreadNotFoundError);
      expect(sourceAssignmentRepo.remove).not.toHaveBeenCalled();
      expect(sourceAssignmentRepo.save).not.toHaveBeenCalled();
    });
  });
});
