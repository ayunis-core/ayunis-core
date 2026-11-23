import type { UUID } from 'crypto';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { OparlConsultationRecord } from './oparl-consultation.record';
import { OparlOrganizationRecord } from './oparl-organization.record';

/** `organizations` of a consultation; the target is kept by OParl ID and linked once mirrored. */
@Entity({ name: 'oparl_consultation_organizations' })
export class OparlConsultationOrganizationRecord {
  @PrimaryColumn({ type: 'uuid' })
  ownerId: UUID;

  @ManyToOne(() => OparlConsultationRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: Relation<OparlConsultationRecord>;

  @PrimaryColumn({ type: 'text' })
  targetOparlId: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  targetId: UUID | null;

  @ManyToOne(() => OparlOrganizationRecord, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'targetId' })
  target: Relation<OparlOrganizationRecord> | null;
}
