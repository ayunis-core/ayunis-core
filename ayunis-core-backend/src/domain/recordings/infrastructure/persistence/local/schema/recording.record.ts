import type { UUID } from 'crypto';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { SingleOwnerCheck } from 'src/domain/ownership/infrastructure/persistence/single-owner-check.decorator';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { TeamRecord } from 'src/iam/teams/infrastructure/repositories/local/schema/team.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

@Entity('recordings')
@SingleOwnerCheck('recordings')
export class RecordingRecord extends BaseRecord {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column()
  @Index()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  userId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord | null;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  workspaceId: UUID | null;

  @ManyToOne(() => WorkspaceRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord | null;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  teamId: UUID | null;

  @ManyToOne(() => TeamRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teamId' })
  team: TeamRecord | null;

  // Every recording carries its tenant in orgId, so organization ownership
  // needs its own marker rather than "no other owner".
  @Column({ default: false })
  isOrgOwned: boolean;

  // Team, organization and workspace recordings outlive their creator.
  @Column({ type: 'varchar', nullable: true })
  @Index()
  createdByUserId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: UserRecord | null;
}
