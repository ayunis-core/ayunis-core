import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { UUID } from 'crypto';
import { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';
import { ArtifactRecord } from './artifact.record';

@Entity({ name: 'thread_artifacts' })
export class ThreadArtifactRecord {
  @PrimaryColumn()
  threadId: UUID;

  @ManyToOne(() => ThreadRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'threadId' })
  thread: ThreadRecord;

  @PrimaryColumn()
  @Index()
  artifactId: UUID;

  @ManyToOne(() => ArtifactRecord, (artifact) => artifact.threadLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'artifactId' })
  artifact: ArtifactRecord;

  @CreateDateColumn()
  createdAt: Date;
}
