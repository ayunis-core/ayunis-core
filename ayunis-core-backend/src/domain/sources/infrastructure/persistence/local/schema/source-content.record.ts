import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { SourceRecord } from './source.record';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UUID } from 'crypto';

@Entity({ name: 'source_contents' })
export class SourceContentRecord extends BaseRecord {
  @Column()
  content: string;

  @Column()
  @Index()
  sourceId: UUID;

  @ManyToOne(() => SourceRecord, (source) => source.content, {
    onDelete: 'CASCADE',
  })
  source: SourceRecord;

  @Column({ type: 'jsonb' })
  meta: Record<string, any>;
}
