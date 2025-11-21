import { Injectable } from '@nestjs/common';
import { Share, AgentShare } from 'src/domain/shares/domain/share.entity';
import { ShareRecord, AgentShareRecord } from '../schema/share.record';
import { ShareScopeMapper } from './share-scope.mapper';

@Injectable()
export class ShareMapper {
  constructor(private readonly shareScopeMapper: ShareScopeMapper) {}

  toDomain(record: ShareRecord): Share {
    if (record instanceof AgentShareRecord) {
      return new AgentShare({
        id: record.id,
        scope: this.shareScopeMapper.toDomain(record.scope),
        agentId: record.agentId,
        ownerId: record.ownerId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    } else {
      throw new Error('Unsupported share record type');
    }
  }

  toRecord(entity: Share): ShareRecord {
    if (entity instanceof AgentShare) {
      const agentShareRecord = new AgentShareRecord();
      agentShareRecord.id = entity.id;
      agentShareRecord.scope = this.shareScopeMapper.toRecord(entity.scope);
      agentShareRecord.ownerId = entity.ownerId;
      agentShareRecord.createdAt = entity.createdAt;
      agentShareRecord.updatedAt = entity.updatedAt;
      agentShareRecord.agentId = entity.agentId;
      return agentShareRecord;
    } else {
      throw new Error(`Unknown share entity type: ${entity.entityType}`);
    }
  }
}
