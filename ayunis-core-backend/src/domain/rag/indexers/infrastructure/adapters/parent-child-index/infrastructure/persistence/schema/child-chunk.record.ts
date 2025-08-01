import { BaseRecord } from '../../../../../../../../../common/db/base-record';
import { BeforeInsert, BeforeUpdate, Column, Entity, ManyToOne } from 'typeorm';
import { ParentChunkRecord } from './parent-chunk.record';
import { UUID } from 'crypto';

@Entity({ name: 'child_chunks' })
export class ChildChunkRecord extends BaseRecord {
  @Column()
  parentId: UUID;

  @ManyToOne(() => ParentChunkRecord, (parent) => parent.children, {
    onDelete: 'CASCADE',
  })
  parent: ParentChunkRecord;

  // Hack until typeorm supports vector column type
  // https://github.com/typeorm/typeorm/pull/11437
  // Note: Flexible dimensions to support multiple embedding models
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  @Column({ type: 'vector' as any, nullable: true })
  embedding: number[];

  @BeforeUpdate()
  @BeforeInsert()
  stringifyVector() {
    // Convert number array to string format, so that Postgres understands it as a vector
    // e.g. '[0.9, 0.1, 0.7]'
    if (this.embedding && Array.isArray(this.embedding)) {
      this.embedding = JSON.stringify(this.embedding) as unknown as number[]; // This is a hack to make typeorm understand the vector column
    }
  }
}
