import type { UUID } from 'crypto';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import type { OparlFilePage } from 'src/domain/oparl/application/models/oparl-document';
import {
  OparlFileSkipReason,
  OparlFileTextStatus,
} from 'src/domain/oparl/domain/oparl-file-text';
import { OparlFileRecord } from './oparl-file.record';

/** The text of a mirrored file, or why it has none; goes with the file. */
@Entity({ name: 'oparl_file_texts' })
export class OparlFileTextRecord {
  @PrimaryColumn({ type: 'uuid' })
  fileId: UUID;

  @OneToOne(() => OparlFileRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: Relation<OparlFileRecord>;

  @Column({ type: 'enum', enum: OparlFileTextStatus })
  status: OparlFileTextStatus;

  @Column({ type: 'enum', enum: OparlFileSkipReason, nullable: true })
  skipReason: OparlFileSkipReason | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  /** SHA-256 of the file's bytes, once downloaded. */
  @Column({ type: 'text', nullable: true })
  contentHash: string | null;

  @Column({ type: 'integer', nullable: true })
  pageCount: number | null;

  @Column({ type: 'jsonb', nullable: true })
  pages: OparlFilePage[] | null;

  @Column({ type: 'integer', default: 0 })
  chunkCount: number;

  /** Of the file's metadata when it was read; a change makes it pending again. */
  @Column({ type: 'text' })
  sourceFingerprint: string;

  /** Consecutive failures for the same fingerprint. */
  @Column({ type: 'integer', default: 0 })
  attempts: number;

  /** When the file was last read or tried. */
  @Column({ type: 'timestamptz' })
  readAt: Date;
}
