import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';

@Entity({ name: 'anonymization_whitelist_entries' })
@Unique(['orgId', 'category'])
export class AnonymizationWhitelistEntryRecord extends BaseRecord {
  @Index()
  @Column()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ type: 'enum', enum: PiiCategory })
  category: PiiCategory;

  @Column({ type: 'text', nullable: true })
  pattern: string | null;
}
