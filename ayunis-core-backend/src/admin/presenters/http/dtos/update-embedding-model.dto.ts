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
import { Currency } from 'src/domain/models/domain/value-objects/currency.enum';

export class UpdateEmbeddingModelDto {
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
  dimensions: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { each: false })
  inputTokenCost?: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { each: false })
  outputTokenCost?: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}
