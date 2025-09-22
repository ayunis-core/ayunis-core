import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { TextSourceDetailsRecord } from './text-source-details.record';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { UUID } from 'crypto';

@Entity({ name: 'source_content_chunks' })
export class SourceContentChunkRecord extends BaseRecord {
  @Column()
  content: string;

  @Column()
  @Index()
  sourceId: UUID;

  @ManyToOne(() => TextSourceDetailsRecord, (source) => source.contentChunks, {
    onDelete: 'CASCADE',
  })
  source: TextSourceDetailsRecord;

  @Column({ type: 'jsonb' })
  meta: Record<string, any>;
}
