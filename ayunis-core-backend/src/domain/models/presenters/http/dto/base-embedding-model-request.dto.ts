import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
  ValidateIf,
} from 'class-validator';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import { Currency } from 'src/domain/models/domain/value-objects/currency.enum';

function hasAnyCostField(o: BaseEmbeddingModelRequestDto): boolean {
  return (
    o.inputTokenCost !== undefined ||
    o.outputTokenCost !== undefined ||
    o.currency !== undefined
  );
}

export abstract class BaseEmbeddingModelRequestDto {
  @ApiProperty({
    description: 'The name of the model',
    example: 'text-embedding-3-small',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The provider of the model',
    enum: ModelProvider,
    example: ModelProvider.OPENAI,
  })
  @IsEnum(ModelProvider)
  provider: ModelProvider;

  @ApiProperty({
    description: 'The display name of the model',
    example: 'Text Embedding 3 Small',
  })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({
    description: 'The dimensions of the embedding',
    enum: EmbeddingDimensions,
    example: EmbeddingDimensions.DIMENSION_1536,
  })
  @IsEnum(EmbeddingDimensions)
  dimensions: EmbeddingDimensions;

  @ApiProperty({
    description: 'Whether the model is archived',
    example: false,
  })
  @IsBoolean()
  isArchived: boolean;

  @ApiPropertyOptional({
    description: 'Cost per million input tokens (in the specified currency)',
    example: 0.13,
    minimum: 0,
  })
  @ValidateIf((o: BaseEmbeddingModelRequestDto) => hasAnyCostField(o))
  @IsNumber()
  @Min(0)
  inputTokenCost?: number;

  @ApiPropertyOptional({
    description: 'Cost per million output tokens (in the specified currency)',
    example: 0,
    minimum: 0,
  })
  @ValidateIf((o: BaseEmbeddingModelRequestDto) => hasAnyCostField(o))
  @IsNumber()
  @Min(0)
  outputTokenCost?: number;

  @ApiPropertyOptional({
    description: 'Currency for token costs',
    enum: Currency,
    example: Currency.EUR,
  })
  @ValidateIf((o: BaseEmbeddingModelRequestDto) => hasAnyCostField(o))
  @IsEnum(Currency)
  currency?: Currency;
}
