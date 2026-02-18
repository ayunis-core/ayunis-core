import { Injectable } from '@nestjs/common';
import {
  ShareScope,
  OrgShareScope,
  TeamShareScope,
} from 'src/domain/shares/domain/share-scope.entity';
import {
  ShareScopeRecord,
  OrgShareScopeRecord,
  TeamShareScopeRecord,
} from '../schema/share-scope.record';

@Injectable()
export class ShareScopeMapper {
  toDomain(record: ShareScopeRecord): ShareScope {
    if (record instanceof OrgShareScopeRecord) {
      return new OrgShareScope({
        id: record.id,
        orgId: record.orgId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    } else if (record instanceof TeamShareScopeRecord) {
      return new TeamShareScope({
        id: record.id,
        teamId: record.teamId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    }
    throw new Error(`Unknown share scope type: ${JSON.stringify(record)}`);
  }

  toRecord(entity: ShareScope): ShareScopeRecord {
    if (entity instanceof OrgShareScope) {
      const orgRecord = new OrgShareScopeRecord();
      orgRecord.id = entity.id;
      orgRecord.orgId = entity.orgId;
      orgRecord.createdAt = entity.createdAt;
      orgRecord.updatedAt = entity.updatedAt;
      return orgRecord;
    } else if (entity instanceof TeamShareScope) {
      const teamRecord = new TeamShareScopeRecord();
      teamRecord.id = entity.id;
      teamRecord.teamId = entity.teamId;
      teamRecord.createdAt = entity.createdAt;
      teamRecord.updatedAt = entity.updatedAt;
      return teamRecord;
    }
    throw new Error(`Unknown share scope type: ${JSON.stringify(entity)}`);
  }
}
