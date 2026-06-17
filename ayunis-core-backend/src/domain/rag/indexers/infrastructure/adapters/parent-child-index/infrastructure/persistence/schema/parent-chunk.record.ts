import { BaseRecord } from '../../../../../../../../../common/db/base-record';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { UUID } from 'crypto';
import { ChildChunkRecord } from './child-chunk.record';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';

@Entity({ name: 'parent_chunks' })
export class ParentChunkRecord extends BaseRecord {
  @Index()
  @Column()
  relatedDocumentId: UUID;

  @ManyToOne(() => SourceRecord, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'relatedDocumentId' })
  source: SourceRecord;

  @Column()
  relatedChunkId: UUID; // The ID of the INPUT chunk that was ingested

  @Column()
  content: string;

  @OneToMany(() => ChildChunkRecord, (child) => child.parent, {
    cascade: true,
  })
  children: ChildChunkRecord[];
}
