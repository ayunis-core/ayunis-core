import { Column, Entity, Index, OneToMany } from 'typeorm';
import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { ArtifactVersionRecord } from './artifact-version.record';

@Entity({ name: 'artifacts' })
export class ArtifactRecord extends BaseRecord {
  @Column()
  @Index()
  threadId: UUID;

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
