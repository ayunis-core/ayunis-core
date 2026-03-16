import { IpAllowlist } from '../../../../domain/ip-allowlist.entity';
import { IpAllowlistRecord } from '../schema/ip-allowlist.record';

export class IpAllowlistMapper {
  static toDomain(record: IpAllowlistRecord): IpAllowlist {
    return new IpAllowlist({
      id: record.id,
      orgId: record.orgId,
      cidrs: record.cidrs,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(domain: IpAllowlist): IpAllowlistRecord {
    const record = new IpAllowlistRecord();
    record.id = domain.id;
    record.orgId = domain.orgId;
    record.cidrs = domain.cidrs;
    record.createdAt = domain.createdAt;
    record.updatedAt = new Date();
    return record;
  }
}
