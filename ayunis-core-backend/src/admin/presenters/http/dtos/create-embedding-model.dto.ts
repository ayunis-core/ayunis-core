import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
} from 'class-validator';
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
  @IsOptional()
  dimensions?: number;
}
