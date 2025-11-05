import { ModelType } from '../../../../domain/value-objects/model-type.enum';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { ModelProvider } from '../../../../domain/value-objects/model-provider.enum';
import { EmbeddingDimensions } from '../../../../domain/value-objects/embedding-dimensions.enum';
import { Column, Entity, Index, TableInheritance, ChildEntity } from 'typeorm';
import { Currency } from '../../../../domain/value-objects/currency.enum';

@Entity({ name: 'models' })
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
@Index(['name', 'provider'], { unique: true })
export abstract class ModelRecord extends BaseRecord {
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
  isArchived: boolean;
}

@ChildEntity(ModelType.LANGUAGE)
export class LanguageModelRecord extends ModelRecord {
  @Column({
    type: 'boolean',
    default: true,
  })
  canStream: boolean;

  @Column({
    type: 'boolean',
    default: true,
  })
  canUseTools: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  isReasoning: boolean;

  @Column({
    type: 'boolean',
    default: false,
  })
  canVision: boolean;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
    transformer: {
      to: (value?: number | null) => value,
      from: (value: string | null) => (value == null ? null : Number(value)),
    },
  })
  inputTokenCost?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
    transformer: {
      to: (value?: number | null) => value,
      from: (value: string | null) => (value == null ? null : Number(value)),
    },
  })
  outputTokenCost?: number;

  @Column({
    type: 'varchar',
    length: 3,
    nullable: true,
  })
  currency?: Currency;
}

@ChildEntity(ModelType.EMBEDDING)
export class EmbeddingModelRecord extends ModelRecord {
  @Column({
    type: 'integer',
  })
  dimensions: EmbeddingDimensions;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
    transformer: {
      to: (value?: number | null) => value,
      from: (value: string | null) => (value == null ? null : Number(value)),
    },
  })
  inputTokenCost?: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
    transformer: {
      to: (value?: number | null) => value,
      from: (value: string | null) => (value == null ? null : Number(value)),
    },
  })
  outputTokenCost?: number;

  @Column({
    type: 'varchar',
    length: 3,
    nullable: true,
  })
  currency?: Currency;
}
