import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsOptional,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';
import { nullToUndefined } from 'src/common/util/null-to-undefined';

function hasAnyCostField(o: BaseLanguageModelRequestDto): boolean {
  return o.inputTokenCost !== undefined || o.outputTokenCost !== undefined;
}

export abstract class BaseLanguageModelRequestDto {
  @ApiProperty({
    description: 'The name of the model',
    example: 'gpt-4',
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
    example: 'GPT-4',
  })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({
    description: 'Whether the model supports streaming',
    example: true,
  })
  @IsBoolean()
  canStream: boolean;

  @ApiProperty({
    description: 'Whether the model supports tool use',
    example: true,
  })
  @IsBoolean()
  canUseTools: boolean;

  @ApiProperty({
    description: 'Whether the model has reasoning capabilities',
    example: false,
  })
  @IsBoolean()
  isReasoning: boolean;

  @ApiProperty({
    description: 'Whether the model supports vision (image processing)',
    example: false,
  })
  @IsBoolean()
  canVision: boolean;

  @ApiProperty({
    description: 'Whether the model is archived',
    example: false,
  })
  @IsBoolean()
  isArchived: boolean;

  @ApiPropertyOptional({
    description: 'Cost per million input tokens in EUR',
    example: 3,
    minimum: 0,
  })
  @Transform(nullToUndefined)
  @ValidateIf((o: BaseLanguageModelRequestDto) => hasAnyCostField(o))
  @IsNumber()
  @Min(0)
  inputTokenCost?: number;

  @ApiPropertyOptional({
    description: 'Cost per million output tokens in EUR',
    example: 15,
    minimum: 0,
  })
  @Transform(nullToUndefined)
  @ValidateIf((o: BaseLanguageModelRequestDto) => hasAnyCostField(o))
  @IsNumber()
  @Min(0)
  outputTokenCost?: number;

  @ApiPropertyOptional({
    description:
      'Fair-use tier label assigned by super admins; drives which fair-use quota bucket the model consumes. Optional today — runtime fallback for untiered models is tracked in AYC-109.',
    enum: ModelTier,
    example: ModelTier.MEDIUM,
  })
  @Transform(nullToUndefined)
  @IsOptional()
  @IsEnum(ModelTier)
  tier?: ModelTier;
}
