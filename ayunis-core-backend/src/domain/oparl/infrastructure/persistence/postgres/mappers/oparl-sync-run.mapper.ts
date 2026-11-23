import { OparlSyncRun } from 'src/domain/oparl/domain/oparl-sync-run.entity';
import { OparlSyncRunRecord } from 'src/domain/oparl/infrastructure/persistence/postgres/schema/oparl-sync-run.record';

export class OparlSyncRunMapper {
  static toDomain(record: OparlSyncRunRecord): OparlSyncRun {
    return new OparlSyncRun({
      id: record.id,
      systemId: record.systemId,
      kind: record.kind,
      status: record.status,
      modifiedSince: record.modifiedSince,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
      error: record.error,
      stats: record.stats,
    });
  }

  static toRecord(run: OparlSyncRun): OparlSyncRunRecord {
    const record = new OparlSyncRunRecord();
    record.id = run.id;
    record.systemId = run.systemId;
    record.kind = run.kind;
    record.status = run.status;
    record.modifiedSince = run.modifiedSince;
    record.startedAt = run.startedAt;
    record.finishedAt = run.finishedAt;
    record.error = run.error;
    record.stats = run.stats;
    return record;
  }
}
