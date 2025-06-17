import {
  Column,
  Entity,
  Index,
  TableInheritance,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { SourceType } from '../../../../domain/source-type.enum';
import { UUID } from 'crypto';
import { ThreadRecord } from '../../../../../threads/infrastructure/persistence/local/schema/thread.record';
import { SourceContentRecord } from './source-content.record';

@Entity({ name: 'sources' })
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class SourceRecord extends BaseRecord {
  @Column()
  @Index()
  threadId?: UUID;

  @ManyToOne(() => ThreadRecord, (thread) => thread.sources)
  thread: ThreadRecord;

  @Column({ nullable: false })
  userId: UUID;

  @Column({
    type: 'enum',
    enum: SourceType,
  })
  type: SourceType;

  @OneToMany(() => SourceContentRecord, (content) => content.source, {
    cascade: true,
  })
  content: SourceContentRecord[];
}
