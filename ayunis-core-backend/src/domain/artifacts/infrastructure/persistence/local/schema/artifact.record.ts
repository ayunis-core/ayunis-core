import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  TableInheritance,
} from 'typeorm';
import { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { ArtifactVersionRecord } from './artifact-version.record';
import { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';

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

  @ManyToOne(() => UserRecord, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord;

  @Column()
  title: string;

  @Column({ default: 1 })
  currentVersionNumber: number;

  @OneToMany(() => ArtifactVersionRecord, (version) => version.artifact, {
    cascade: true,
  })
  versions?: ArtifactVersionRecord[];
}
