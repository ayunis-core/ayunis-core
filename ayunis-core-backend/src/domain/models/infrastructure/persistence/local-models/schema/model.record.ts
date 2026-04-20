import { ModelType } from '../../../../domain/value-objects/model-type.enum';
import { BaseRecord } from '../../../../../../common/db/base-record';
import { ModelProvider } from '../../../../domain/value-objects/model-provider.enum';
import { EmbeddingDimensions } from '../../../../domain/value-objects/embedding-dimensions.enum';
import { Column, Entity, Index, TableInheritance, ChildEntity } from 'typeorm';

const tokenCostColumnOptions = {
  type: 'decimal' as const,
  precision: 10,
  scale: 6,
  nullable: true,
  transformer: {
    to: (value?: number | null) => value,
    // Normalize NULL rows to `undefined` so it matches the column's TS type
    // (`number | undefined`) and downstream arithmetic cannot silently
    // coerce `null` to 0.
    from: (value: string | null) =>
      value === null ? undefined : Number(value),
  },
};

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

  @Column(tokenCostColumnOptions)
  inputTokenCost?: number;

  @Column(tokenCostColumnOptions)
  outputTokenCost?: number;

  // Stored as varchar (not a Postgres enum) on purpose: adding new tiers later
  // should not require an `ALTER TYPE` migration. The allow-list in
  // ModelMapper.parseTier defends against stray values when reading.
  @Column({
    type: 'varchar',
    nullable: true,
  })
  tier?: string | null;
}

@ChildEntity(ModelType.EMBEDDING)
export class EmbeddingModelRecord extends ModelRecord {
  @Column({
    type: 'integer',
  })
  dimensions: EmbeddingDimensions;

  @Column(tokenCostColumnOptions)
  inputTokenCost?: number;

  @Column(tokenCostColumnOptions)
  outputTokenCost?: number;
}

@ChildEntity(ModelType.IMAGE_GENERATION)
export class ImageGenerationModelRecord extends ModelRecord {
  @Column(tokenCostColumnOptions)
  inputTokenCost?: number;

  @Column(tokenCostColumnOptions)
  outputTokenCost?: number;
}
