import { UUID } from 'crypto';
import { BaseRecord } from 'src/common/db/base-record';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { LanguageModelRecord } from 'src/domain/models/infrastructure/persistence/local-models/schema/model.record';

@Entity({ name: 'model_mode_entries' })
@Unique(['mode', 'modelId'])
@Unique(['mode', 'position'])
export class ModelModeEntryRecord extends BaseRecord {
  @Column({ type: 'enum', enum: ModelMode })
  mode: ModelMode;

  @Column()
  modelId: UUID;

  @ManyToOne(() => LanguageModelRecord, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'modelId' })
  model: LanguageModelRecord;

  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;
}
