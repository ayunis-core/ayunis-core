import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import type { UUID } from 'crypto';
import { SourceRecord } from '../../../../../sources/infrastructure/persistence/local/schema/source.record';
import { OrgRecord } from '../../../../../../iam/orgs/infrastructure/repositories/local/schema/org.record';

@Entity('knowledge_bases')
export class KnowledgeBaseRecord extends BaseRecord {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column()
  @Index()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column()
  @Index()
  userId: UUID;

  @OneToMany(() => SourceRecord, (source) => source.knowledgeBase)
  sources: SourceRecord[];
}
