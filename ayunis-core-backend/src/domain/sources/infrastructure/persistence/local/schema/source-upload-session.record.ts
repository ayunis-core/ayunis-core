import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { UserRecord } from 'src/iam/users/infrastructure/repositories/local/schema/user.record';
import { SourceUploadSessionStatus } from 'src/domain/sources/domain/upload/source-upload-session-status.enum';
import { SourceUploadTargetType } from 'src/domain/sources/domain/upload/source-upload-target-type.enum';
import type { UploadedSourceReference } from 'src/domain/sources/domain/upload/uploaded-source-reference';

@Entity('source_upload_sessions')
export class SourceUploadSessionRecord extends BaseRecord {
  @Index()
  @Column()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'orgId' })
  org: OrgRecord;

  @Column({ type: 'varchar', nullable: true })
  userId: UUID | null;

  @ManyToOne(() => UserRecord, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: UserRecord | null;

  @Column({ type: 'enum', enum: SourceUploadTargetType })
  targetType: SourceUploadTargetType;

  @Column({ type: 'varchar', nullable: true })
  targetId: UUID | null;

  @Column()
  fileName: string;

  @Column()
  fileType: string;

  @Column({ type: 'bigint' })
  fileSize: string;

  // Looked up per incomplete multipart upload by the sweep; unique by
  // construction since the key embeds the session id.
  @Index('IDX_source_upload_sessions_storageKey', { unique: true })
  @Column()
  storageKey: string;

  @Column({ type: 'varchar', nullable: true })
  expectedETag: string | null;

  @Column({ default: false })
  multipart: boolean;

  @Column({ type: 'varchar', nullable: true })
  multipartUploadId: string | null;

  @Index()
  @Column({ type: 'enum', enum: SourceUploadSessionStatus })
  status: SourceUploadSessionStatus;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  sources: UploadedSourceReference[];

  @Column({ type: 'timestamp' })
  expiresAt: Date;
}
