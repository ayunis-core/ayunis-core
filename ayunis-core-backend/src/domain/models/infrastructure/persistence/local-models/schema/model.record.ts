import { BaseRecord } from '../../../../../../common/db/base-record';
import { ModelProvider } from '../../../../domain/value-objects/model-provider.object';
import { Column, Entity, Index } from 'typeorm';

@Entity({ name: 'models' })
@Index(['name', 'provider'], { unique: true })
export class ModelRecord extends BaseRecord {
  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: ModelProvider,
  })
  provider: ModelProvider;

  @Column()
  displayName: string;

  @Column({
    type: 'boolean',
    default: false,
  })
  canStream: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  isReasoning: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  isArchived: boolean;
}
