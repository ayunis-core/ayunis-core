import {
  Check,
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
import { ThreadArtifactRecord } from './thread-artifact.record';
import { ArtifactPiiMaskRecord } from './artifact-pii-mask.record';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { WorkspaceRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace.record';

@Entity({ name: 'artifacts' })
@Check(`num_nonnulls("userId", "workspaceId") = 1`)
@TableInheritance({
  column: { type: 'varchar', name: 'type', default: ArtifactType.DOCUMENT },
})
export abstract class ArtifactRecord extends BaseRecord {
  /** The owner of a personal artifact. */
  @Column({ type: 'varchar', nullable: true })
  @Index()
  userId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserRecord | null;

  /** The owner of a workspace artifact. */
  @Column({ type: 'varchar', nullable: true })
  @Index()
  workspaceId: UUID | null;

  @ManyToOne(() => WorkspaceRecord, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspaceId' })
  workspace: WorkspaceRecord | null;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  creatorId: UUID | null;

  @ManyToOne(() => UserRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creatorId' })
  creator: UserRecord | null;

  @Column()
  title: string;

  @Column({ default: false })
  isAnonymous: boolean;

  @Column({ default: 1 })
  currentVersionNumber: number;

  @OneToMany(() => ArtifactVersionRecord, (version) => version.artifact, {
    cascade: true,
  })
  versions?: ArtifactVersionRecord[];

  @OneToMany(() => ThreadArtifactRecord, (link) => link.artifact)
  threadLinks?: ThreadArtifactRecord[];

  @OneToMany(() => ArtifactPiiMaskRecord, (mask) => mask.artifact)
  piiMasks?: ArtifactPiiMaskRecord[];
}
