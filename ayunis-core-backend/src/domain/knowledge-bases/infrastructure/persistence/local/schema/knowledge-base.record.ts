import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import type { UUID } from 'crypto';
import { SourceRecord } from '../../../../../sources/infrastructure/persistence/local/schema/source.record';

@Entity('knowledge_bases')
export class KnowledgeBaseRecord extends BaseRecord {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column()
  @Index()
  orgId: UUID;

  @Column()
  @Index()
  userId: UUID;

  @OneToMany(() => SourceRecord, (source) => source.knowledgeBase)
  sources: SourceRecord[];
}
