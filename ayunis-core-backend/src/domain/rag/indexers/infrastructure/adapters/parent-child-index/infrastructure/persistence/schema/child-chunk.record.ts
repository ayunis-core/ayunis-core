import { BaseRecord } from '../../../../../../../../../common/db/base-record';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  ManyToOne,
  Index,
} from 'typeorm';
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

  // Hack until typeorm supports vector column type
  // https://github.com/typeorm/typeorm/pull/11437
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  @Column({ name: 'embedding_1024', type: 'vector' as any, nullable: true })
  embedding1024: number[] | null;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  @Column({ name: 'embedding_1536', type: 'vector' as any, nullable: true })
  embedding1536: number[] | null;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  @Column({ name: 'embedding_2560', type: 'vector' as any, nullable: true })
  embedding2560: number[] | null;

  @BeforeUpdate()
  @BeforeInsert()
  stringifyVectorColumns() {
    // Convert number array(s) to string format so Postgres understands it as a vector
    // e.g. '[0.9, 0.1, 0.7]'
    if (this.embedding1024 && Array.isArray(this.embedding1024)) {
      this.embedding1024 = JSON.stringify(
        this.embedding1024,
      ) as unknown as number[];
    }
    if (this.embedding1536 && Array.isArray(this.embedding1536)) {
      this.embedding1536 = JSON.stringify(
        this.embedding1536,
      ) as unknown as number[];
    }
    if (this.embedding2560 && Array.isArray(this.embedding2560)) {
      this.embedding2560 = JSON.stringify(
        this.embedding2560,
      ) as unknown as number[];
    }
  }
}
