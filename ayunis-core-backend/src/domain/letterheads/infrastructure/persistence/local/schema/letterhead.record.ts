import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import type { PageMargins } from '../../../../domain/value-objects/page-margins';
import { OrgRecord } from '../../../../../../iam/orgs/infrastructure/repositories/local/schema/org.record';

@Entity({ name: 'letterheads' })
export class LetterheadRecord extends BaseRecord {
  @Column()
  @Index()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ type: 'varchar' })
  firstPageStoragePath: string;

  @Column({ type: 'varchar', nullable: true })
  continuationPageStoragePath: string | null;

  @Column({ type: 'simple-json' })
  firstPageMargins: PageMargins;

  @Column({ type: 'simple-json' })
  continuationPageMargins: PageMargins;
}
