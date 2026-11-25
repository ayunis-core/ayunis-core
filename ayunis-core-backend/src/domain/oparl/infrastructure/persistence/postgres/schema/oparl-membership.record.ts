import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Relation,
  Unique,
} from 'typeorm';
import type { UUID } from 'crypto';
import { OparlBodyObjectBase } from './oparl-body-object-base.record';
import { OparlOrganizationRecord } from './oparl-organization.record';
import { OparlPersonRecord } from './oparl-person.record';

@Entity({ name: 'oparl_memberships' })
@Unique(['systemId', 'oparlId'])
export class OparlMembershipRecord extends OparlBodyObjectBase {
  @Column({ type: 'text', nullable: true })
  role: string | null;

  @Column({ type: 'boolean', nullable: true })
  votingRight: boolean | null;

  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'text', nullable: true })
  personOparlId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  personId: UUID | null;

  @ManyToOne(() => OparlPersonRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'personId' })
  person: Relation<OparlPersonRecord> | null;

  @Column({ type: 'text', nullable: true })
  organizationOparlId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  organizationId: UUID | null;

  @ManyToOne(() => OparlOrganizationRecord, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizationId' })
  organization: Relation<OparlOrganizationRecord> | null;

  @Column({ type: 'text', nullable: true })
  onBehalfOfOparlId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  onBehalfOfId: UUID | null;

  @ManyToOne(() => OparlOrganizationRecord, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'onBehalfOfId' })
  onBehalfOf: Relation<OparlOrganizationRecord> | null;
}
