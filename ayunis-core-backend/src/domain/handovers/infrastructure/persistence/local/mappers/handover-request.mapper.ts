import { Injectable } from '@nestjs/common';
import { HandoverRequest } from 'src/domain/handovers/domain/handover-request.entity';
import type { HandoverRequestView } from 'src/domain/handovers/domain/handover-request-view';
import { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';
import {
  HandoverRequestRecord,
  HandoverTargetType,
} from 'src/domain/handovers/infrastructure/persistence/local/schema/handover-request.record';

@Injectable()
export class HandoverRequestMapper {
  toDomain(record: HandoverRequestRecord): HandoverRequest {
    const resourceId =
      record.resourceType === HandoverResourceType.SKILL
        ? record.skillId
        : record.knowledgeBaseId;
    if (!resourceId) {
      throw new Error(`Handover request ${record.id} has no resource`);
    }
    return new HandoverRequest({
      id: record.id,
      orgId: record.orgId,
      resourceType: record.resourceType,
      resourceId,
      target: record.targetTeamId
        ? { type: 'team', teamId: record.targetTeamId }
        : { type: 'org' },
      requestedByUserId: record.requestedByUserId,
      status: record.status,
      createdAt: record.createdAt,
      decidedAt: record.decidedAt,
      decidedByUserId: record.decidedByUserId,
    });
  }

  toView(record: HandoverRequestRecord): HandoverRequestView {
    const resourceName = record.skill?.name ?? record.knowledgeBase?.name ?? '';
    return {
      request: this.toDomain(record),
      resourceName,
      requesterName: record.requestedBy?.name ?? '',
      targetTeamName: record.targetTeam?.name ?? null,
    };
  }

  toRecord(request: HandoverRequest): HandoverRequestRecord {
    const record = new HandoverRequestRecord();
    const isSkill = request.resourceType === HandoverResourceType.SKILL;
    record.id = request.id;
    record.orgId = request.orgId;
    record.resourceType = request.resourceType;
    record.skillId = isSkill ? request.resourceId : null;
    record.knowledgeBaseId = isSkill ? null : request.resourceId;
    record.targetType =
      request.target.type === 'team'
        ? HandoverTargetType.TEAM
        : HandoverTargetType.ORG;
    record.targetTeamId =
      request.target.type === 'team' ? request.target.teamId : null;
    record.requestedByUserId = request.requestedByUserId;
    record.status = request.status;
    record.createdAt = request.createdAt;
    record.decidedAt = request.decidedAt;
    record.decidedByUserId = request.decidedByUserId;
    return record;
  }
}
