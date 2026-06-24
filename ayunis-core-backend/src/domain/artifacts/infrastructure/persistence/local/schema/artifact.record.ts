import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  TableInheritance,
} from 'typeorm';
import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { ArtifactVersionRecord } from './artifact-version.record';
import { ThreadRecord } from '../../../../../threads/infrastructure/persistence/local/schema/thread.record';
import { ArtifactType } from '../../../../domain/value-objects/artifact-type.enum';

@Entity({ name: 'artifacts' })
@TableInheritance({
  column: { type: 'varchar', name: 'type', default: ArtifactType.DOCUMENT },
})
export abstract class ArtifactRecord extends BaseRecord {
  @Column()
  @Index()
  threadId: UUID;

  @ManyToOne(() => ThreadRecord, { onDelete: 'CASCADE' })
  thread: ThreadRecord;

  @Column()
  @Index()
  userId: UUID;

  @Column()
  title: string;

  @Column({ default: 1 })
  currentVersionNumber: number;

  @OneToMany(() => ArtifactVersionRecord, (version) => version.artifact, {
    cascade: true,
  })
  versions?: ArtifactVersionRecord[];
}
