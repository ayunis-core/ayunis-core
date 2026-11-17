import { BaseRecord } from 'src/common/db/base-record';
import { Column, Entity, ManyToOne, Index } from 'typeorm';
import { ParentChunkRecord } from './parent-chunk.record';
import { UUID } from 'crypto';

@Entity({ name: 'child_chunks' })
export class ChildChunkRecord extends BaseRecord {
  @Index()
  @Column()
  parentId: UUID;

  @ManyToOne(() => ParentChunkRecord, (parent) => parent.children, {
    onDelete: 'CASCADE',
  })
  parent: ParentChunkRecord;

  // !! IMPORTANT !!
  // We use two explicit columns to avoid mixing dimensions
  // If you add new dimensions, you need to update the embedding-dimensions.enum.ts
  // and the parent_child_indexer repository.

  @Column({ name: 'embedding_1024', type: 'vector', nullable: true })
  embedding1024: number[] | null;

  @Column({ name: 'embedding_1536', type: 'vector', nullable: true })
  embedding1536: number[] | null;

  @Column({ name: 'embedding_2560', type: 'vector', nullable: true })
  embedding2560: number[] | null;
}
