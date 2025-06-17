import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  ManyToOne,
} from 'typeorm';
import { SourceContentRecord } from './source-content.record';
import { SourceRecord } from './source.record';
import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';

@Entity({ name: 'source_content_chunks' })
export class SourceContentChunkRecord extends BaseRecord {
  @Column()
  @Index()
  sourceId: UUID;

  @ManyToOne(() => SourceRecord, (source) => source.content, {
    onDelete: 'CASCADE',
  })
  source: SourceRecord;

  @Column()
  @Index()
  sourceContentId: UUID;

  @ManyToOne(() => SourceContentRecord, (content) => content.chunks, {
    onDelete: 'CASCADE',
    eager: true,
  })
  sourceContent: SourceContentRecord;

  @Column()
  chunkContent: string;

  // Hack until typeorm supports vector column type
  // https://github.com/typeorm/typeorm/pull/11437
  // Note: Flexible dimensions to support multiple embedding models
  @Column({ type: 'vector' as any, nullable: true })
  vector: number[];

  @Column()
  embeddingModel: string; // e.g., "text-embedding-3-small", "mistral-embed"

  @Column()
  embeddingProvider: string; // e.g., "openai", "mistral"

  @Column()
  embeddingDimension: number; // e.g., 1536, 1024

  @BeforeUpdate()
  @BeforeInsert()
  stringifyVector() {
    // Convert number array to string format, so that Postgres understands it as a vector
    // e.g. '[0.9, 0.1, 0.7]'
    if (this.vector && Array.isArray(this.vector)) {
      this.vector = JSON.stringify(this.vector) as any;
    }
  }
}
