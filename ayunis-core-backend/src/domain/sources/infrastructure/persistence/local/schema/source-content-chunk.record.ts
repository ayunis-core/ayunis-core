import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { TextSourceDetailsRecord } from './text-source-details.record';
import { BaseRecord } from '../../../../../../common/db/base-record';

@Entity({ name: 'source_content_chunks' })
export class SourceContentChunkRecord extends BaseRecord {
  @Column()
  content: string;

  @ManyToOne(() => TextSourceDetailsRecord, (source) => source.contentChunks, {
    onDelete: 'CASCADE',
  })
  @Index()
  source: TextSourceDetailsRecord;

  @Column({ type: 'jsonb' })
  meta: Record<string, unknown>;
}
