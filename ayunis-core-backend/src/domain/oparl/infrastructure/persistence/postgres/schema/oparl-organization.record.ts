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

@Entity({ name: 'oparl_organizations' })
@Unique(['systemId', 'oparlId'])
export class OparlOrganizationRecord extends OparlBodyObjectBase {
  @Column({ type: 'text', nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  shortName: string | null;

  @Column({ type: 'text', nullable: true })
  organizationType: string | null;

  @Column({ type: 'text', nullable: true })
  classification: string | null;

  @Column({ type: 'text', array: true, nullable: true })
  post: string[] | null;

  @Column({ type: 'date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'text', nullable: true })
  website: string | null;

  @Column({ type: 'text', nullable: true })
  subOrganizationOfOparlId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  subOrganizationOfId: UUID | null;

  @ManyToOne(() => OparlOrganizationRecord, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'subOrganizationOfId' })
  subOrganizationOf: Relation<OparlOrganizationRecord> | null;
}
