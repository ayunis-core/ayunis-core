import { Check, Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { HandoverResourceType } from 'src/domain/handovers/domain/handover-resource-type.enum';
import { HandoverStatus } from 'src/domain/handovers/domain/handover-status.enum';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

export enum HandoverTargetType {
  TEAM = 'team',
  ORG = 'org',
}

@Entity({ name: 'handover_requests' })
@Check(
  'CHK_handover_requests_resource',
  `("resourceType" = 'skill' AND "skillId" IS NOT NULL AND "knowledgeBaseId" IS NULL) OR ("resourceType" = 'knowledge_base' AND "knowledgeBaseId" IS NOT NULL AND "skillId" IS NULL)`,
)
@Check(
  'CHK_handover_requests_target',
  `("targetType" = 'team') = ("targetTeamId" IS NOT NULL)`,
)
@Index('UQ_handover_requests_pending_skill', ['skillId'], {
  unique: true,
  where: `"status" = 'pending' AND "skillId" IS NOT NULL`,
})
@Index('UQ_handover_requests_pending_knowledge_base', ['knowledgeBaseId'], {
  unique: true,
  where: `"status" = 'pending' AND "knowledgeBaseId" IS NOT NULL`,
})
export class HandoverRequestRecord extends BaseRecord {
  @Index()
  @Column({ type: 'varchar' })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'orgId' })
  org?: OrgRecord;

  @Column({ type: 'enum', enum: HandoverResourceType })
  resourceType: HandoverResourceType;

  @Column({ type: 'varchar', nullable: true })
  skillId: UUID | null;

  @ManyToOne(() => SkillRecord, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'skillId' })
  skill?: SkillRecord | null;

  @Column({ type: 'varchar', nullable: true })
  knowledgeBaseId: UUID | null;

  @ManyToOne(() => KnowledgeBaseRecord, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'knowledgeBaseId' })
  knowledgeBase?: KnowledgeBaseRecord | null;

  @Column({ type: 'enum', enum: HandoverTargetType })
  targetType: HandoverTargetType;

  @Column({ type: 'varchar', nullable: true })
  targetTeamId: UUID | null;

  @ManyToOne(() => TeamRecord, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'targetTeamId' })
  targetTeam?: TeamRecord | null;

  @Index()
  @Column({ type: 'varchar' })
  requestedByUserId: UUID;

  @ManyToOne(() => UserRecord, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'requestedByUserId' })
  requestedBy?: UserRecord;

  @Column({
    type: 'enum',
    enum: HandoverStatus,
    default: HandoverStatus.PENDING,
  })
  status: HandoverStatus;

  @Column({ type: 'timestamp', nullable: true })
  decidedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  decidedByUserId: UUID | null;

  @ManyToOne(() => UserRecord, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'decidedByUserId' })
  decidedBy?: UserRecord | null;
}
