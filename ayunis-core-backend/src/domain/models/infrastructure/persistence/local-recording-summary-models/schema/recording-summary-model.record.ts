import { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { PermittedModelRecord } from 'src/domain/models/infrastructure/persistence/local-permitted-models/schema/permitted-model.record';

/** Deleting the permit deletes the row, so the org falls back to its default model. */
@Entity({ name: 'recording_summary_models' })
@Index(['orgId'], { unique: true })
export class RecordingSummaryModelRecord extends BaseRecord {
  @Column()
  orgId: UUID;

  @ManyToOne(() => OrgRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org?: OrgRecord;

  @Column()
  @Index()
  permittedModelId: UUID;

  @ManyToOne(() => PermittedModelRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permittedModelId' })
  permittedModel?: PermittedModelRecord;
}
