import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

export class CreateEmbeddingModelDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ModelProvider)
  @IsNotEmpty()
  provider: ModelProvider;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsBoolean()
  isArchived: boolean;

  @IsNumber()
  @IsPositive()
  @IsEnum(EmbeddingDimensions)
  dimensions: EmbeddingDimensions;
}
