import { BaseRecord } from 'src/common/db/base-record';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.object';
import { Column, Entity, Index } from 'typeorm';

@Entity()
@Index(['name', 'provider'], { unique: true })
export class LocalModelRecord extends BaseRecord {
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
