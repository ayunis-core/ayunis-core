import type { UUID } from 'crypto';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  type Relation,
  Unique,
} from 'typeorm';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { OparlBodyRecord } from './oparl-body.record';

/** `createdAt` is when the body was linked. */
@Entity({ name: 'oparl_body_links' })
@Unique(['orgId', 'bodyId'])
export class OparlBodyLinkRecord extends BaseRecord {
  @Column({ type: 'uuid' })
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: Relation<OrgRecord>;

  @Index()
  @Column({ type: 'uuid' })
  bodyId: UUID;

  @ManyToOne(() => OparlBodyRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bodyId' })
  body: Relation<OparlBodyRecord>;

  @Column({ type: 'uuid', nullable: true })
  linkedByUserId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linkedByUserId' })
  linkedByUser: Relation<UserRecord> | null;
}
