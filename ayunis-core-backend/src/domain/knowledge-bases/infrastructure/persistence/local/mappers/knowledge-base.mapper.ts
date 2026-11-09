import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { AbstractCollectiveKnowledgeBase } from 'src/domain/knowledge-bases/domain/collective-knowledge-base.entity';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';

type Owner =
  | { type: 'user'; id: UUID }
  | { type: 'workspace'; id: UUID }
  | { type: 'team'; id: UUID }
  | { type: 'org' };

@Injectable()
export class KnowledgeBaseMapper {
  toDomain(record: KnowledgeBaseRecord): KnowledgeBase {
    const params = {
      id: record.id,
      name: record.name,
      description: record.description,
      orgId: record.orgId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
    const owner = this.ownerOf(record);
    switch (owner.type) {
      case 'user':
        return new PersonalKnowledgeBase({ ...params, userId: owner.id });
      case 'workspace':
        return new WorkspaceKnowledgeBase({ ...params, workspaceId: owner.id });
      case 'team':
        return new TeamKnowledgeBase({
          ...params,
          teamId: owner.id,
          isActive: record.isActive,
        });
      case 'org':
        return new OrgKnowledgeBase({ ...params, isActive: record.isActive });
    }
  }

  private ownerOf(record: KnowledgeBaseRecord): Owner {
    // Records loaded before a column existed may omit it entirely.
    const owners: Owner[] = [
      ...(record.userId ? [{ type: 'user' as const, id: record.userId }] : []),
      ...(record.workspaceId
        ? [{ type: 'workspace' as const, id: record.workspaceId }]
        : []),
      ...(record.teamId ? [{ type: 'team' as const, id: record.teamId }] : []),
      ...(record.isOrgOwned ? [{ type: 'org' as const }] : []),
    ];
    if (owners.length !== 1) {
      throw new Error(`Knowledge base ${record.id} has invalid ownership`);
    }
    return owners[0];
  }

  toPersonal(record: KnowledgeBaseRecord): PersonalKnowledgeBase {
    const entity = this.toDomain(record);
    if (!(entity instanceof PersonalKnowledgeBase)) {
      throw new Error(`Expected personal knowledge base ${record.id}`);
    }
    return entity;
  }

  toWorkspace(record: KnowledgeBaseRecord): WorkspaceKnowledgeBase {
    const entity = this.toDomain(record);
    if (!(entity instanceof WorkspaceKnowledgeBase)) {
      throw new Error(`Expected workspace knowledge base ${record.id}`);
    }
    return entity;
  }

  toRecord(entity: KnowledgeBase): KnowledgeBaseRecord {
    const record = new KnowledgeBaseRecord();
    record.id = entity.id;
    record.name = entity.name;
    record.description = entity.description;
    record.orgId = entity.orgId;
    record.userId =
      entity instanceof PersonalKnowledgeBase ? entity.userId : null;
    record.workspaceId =
      entity instanceof WorkspaceKnowledgeBase ? entity.workspaceId : null;
    record.teamId = entity instanceof TeamKnowledgeBase ? entity.teamId : null;
    record.isOrgOwned = entity instanceof OrgKnowledgeBase;
    record.isActive =
      entity instanceof AbstractCollectiveKnowledgeBase && entity.isActive;
    record.createdAt = entity.createdAt;
    record.updatedAt = entity.updatedAt;
    return record;
  }
}
