import { OparlSystem } from 'src/domain/oparl/domain/oparl-system.entity';
import { OparlSystemRecord } from 'src/domain/oparl/infrastructure/persistence/postgres/schema/oparl-system.record';

export class OparlSystemMapper {
  static toDomain(record: OparlSystemRecord): OparlSystem {
    return new OparlSystem({
      id: record.id,
      url: record.url,
      oparlId: record.oparlId,
      name: record.name,
      vendor: record.vendor,
      product: record.product,
      oparlVersion: record.oparlVersion,
      website: record.website,
      raw: record.raw as Record<string, unknown>,
      nextSyncAt: record.nextSyncAt,
      lastDeltaSyncAt: record.lastDeltaSyncAt,
      lastFullSyncAt: record.lastFullSyncAt,
      lastRunStatus: record.lastRunStatus,
      lastRunFinishedAt: record.lastRunFinishedAt,
      lastError: record.lastError,
      consecutiveFailures: record.consecutiveFailures,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(system: OparlSystem): OparlSystemRecord {
    const record = new OparlSystemRecord();
    record.id = system.id;
    record.url = system.url;
    record.oparlId = system.oparlId;
    record.name = system.name;
    record.vendor = system.vendor;
    record.product = system.product;
    record.oparlVersion = system.oparlVersion;
    record.website = system.website;
    record.raw = system.raw;
    Object.assign(record, OparlSystemMapper.toSyncState(system));
    return record;
  }

  static toSyncState(
    system: OparlSystem,
  ): Pick<
    OparlSystemRecord,
    | 'nextSyncAt'
    | 'lastDeltaSyncAt'
    | 'lastFullSyncAt'
    | 'lastRunStatus'
    | 'lastRunFinishedAt'
    | 'lastError'
    | 'consecutiveFailures'
  > {
    return {
      nextSyncAt: system.nextSyncAt,
      lastDeltaSyncAt: system.lastDeltaSyncAt,
      lastFullSyncAt: system.lastFullSyncAt,
      lastRunStatus: system.lastRunStatus,
      lastRunFinishedAt: system.lastRunFinishedAt,
      lastError: system.lastError,
      consecutiveFailures: system.consecutiveFailures,
    };
  }
}
