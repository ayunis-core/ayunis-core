import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { UUID } from 'crypto';
import { ArtifactRecord } from './artifact.record';
import { AuthorType } from '../../../../domain/value-objects/author-type.enum';

@Entity({ name: 'artifact_versions' })
@Unique('UQ_artifact_version_number', ['artifactId', 'versionNumber'])
export class ArtifactVersionRecord {
  @PrimaryColumn()
  id: UUID;

  @Column()
  @Index()
  artifactId: UUID;

  @ManyToOne(() => ArtifactRecord, (artifact) => artifact.versions, {
    onDelete: 'CASCADE',
  })
  artifact: ArtifactRecord;

  @Column()
  versionNumber: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar' })
  authorType: AuthorType;

  @Column({ type: 'uuid', nullable: true })
  authorId: UUID | null;

  @CreateDateColumn()
  createdAt: Date;
}
