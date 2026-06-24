import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';

@Entity({ name: 'crawl_domain_grants' })
export class CrawlDomainGrantRecord extends BaseRecord {
  @Column({ unique: true })
  domain: string;

  @Column()
  @Index()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;
}
