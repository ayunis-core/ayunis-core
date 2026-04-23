import { UUID } from 'crypto';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { LanguageModelRecord } from '../../local-models/schema/model.record';

// References the catalog model (not the org-scoped permitted_models row) so a
// user's preference survives an admin removing and re-adding the same model.
@Entity({ name: 'user_default_models' })
export class UserDefaultModelRecord extends BaseRecord {
  @Column({ nullable: false })
  @Index({ unique: true })
  userId: UUID;

  @Column({ nullable: false })
  modelId: UUID;

  @ManyToOne(() => LanguageModelRecord, {
    nullable: false,
    eager: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'modelId' })
  model: LanguageModelRecord;
}
