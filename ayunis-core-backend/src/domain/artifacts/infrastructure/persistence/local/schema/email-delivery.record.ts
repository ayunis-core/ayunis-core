import { Column, Entity, Index, ManyToOne, Unique } from 'typeorm';
import type { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { ArtifactRecord } from './artifact.record';
import { EmailDeliveryStatus } from 'src/domain/artifacts/domain/email-delivery.entity';

@Entity({ name: 'artifact_email_deliveries' })
@Unique('UQ_artifact_email_delivery_version', ['artifactId', 'versionNumber'])
export class EmailDeliveryRecord extends BaseRecord {
  @Column({ type: 'uuid' })
  @Index()
  artifactId: UUID;

  @ManyToOne(() => ArtifactRecord, { onDelete: 'CASCADE' })
  artifact: ArtifactRecord;

  @Column({ type: 'integer' })
  versionNumber: number;

  @Column({ type: 'varchar' })
  status: EmailDeliveryStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  sentAt: Date | null;
}
