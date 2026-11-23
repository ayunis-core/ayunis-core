import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Relation,
  Unique,
} from 'typeorm';
import type { UUID } from 'crypto';
import { OparlBodyObjectBase } from './oparl-body-object-base.record';

@Entity({ name: 'oparl_files' })
@Unique(['systemId', 'oparlId'])
export class OparlFileRecord extends OparlBodyObjectBase {
  @Column({ type: 'text', nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  fileName: string | null;

  @Column({ type: 'text', nullable: true })
  mimeType: string | null;

  @Column({ type: 'date', nullable: true })
  date: string | null;

  @Column({ type: 'bigint', nullable: true })
  size: string | null;

  @Column({ type: 'text', nullable: true })
  sha1Checksum: string | null;

  @Column({ type: 'text', nullable: true })
  sha512Checksum: string | null;

  @Column({ type: 'text', nullable: true })
  accessUrl: string | null;

  @Column({ type: 'text', nullable: true })
  downloadUrl: string | null;

  @Column({ type: 'text', nullable: true })
  externalServiceUrl: string | null;

  @Column({ type: 'text', nullable: true })
  fileLicense: string | null;

  @Column({ type: 'text', nullable: true })
  masterFileOparlId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  masterFileId: UUID | null;

  @ManyToOne(() => OparlFileRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'masterFileId' })
  masterFile: Relation<OparlFileRecord> | null;
}
