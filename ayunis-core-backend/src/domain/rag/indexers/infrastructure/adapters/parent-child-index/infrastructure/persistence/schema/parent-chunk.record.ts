import { BaseRecord } from '../../../../../../../../../common/db/base-record';
import { Column, Entity, OneToMany } from 'typeorm';
import { UUID } from 'crypto';
import { ChildChunkRecord } from './child-chunk.record';

@Entity({ name: 'parent_chunks' })
export class ParentChunkRecord extends BaseRecord {
  @Column()
  relatedDocumentId: UUID;

  @Column()
  relatedChunkId: UUID; // The ID of the INPUT chunk that was ingested

  @Column()
  content: string;

  @OneToMany(() => ChildChunkRecord, (child) => child.parent, {
    cascade: true,
  })
  children: ChildChunkRecord[];
}
