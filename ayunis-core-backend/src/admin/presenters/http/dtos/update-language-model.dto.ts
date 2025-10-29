import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { Currency } from 'src/domain/models/domain/value-objects/currency.enum';

export class UpdateLanguageModelDto {
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
  canStream: boolean;

  @IsBoolean()
  canUseTools: boolean;

  @IsBoolean()
  canVision: boolean;

  @IsBoolean()
  isReasoning: boolean;

  @IsBoolean()
  isArchived: boolean;

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
