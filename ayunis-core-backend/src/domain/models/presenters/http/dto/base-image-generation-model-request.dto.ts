import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { nullToUndefined } from 'src/common/util/null-to-undefined';
import { SUPPORTED_IMAGE_GENERATION_PROVIDERS } from 'src/domain/models/application/services/model-policy.service';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

function hasAnyCostField(o: BaseImageGenerationModelRequestDto): boolean {
  return o.inputTokenCost !== undefined || o.outputTokenCost !== undefined;
}

export abstract class BaseImageGenerationModelRequestDto {
  @ApiProperty({
    description: 'The name of the model',
    example: 'gpt-image-1',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description:
      'The provider of the model. Image-generation models are Azure-only in v1.',
    enum: SUPPORTED_IMAGE_GENERATION_PROVIDERS,
    example: ModelProvider.AZURE,
  })
  @IsIn(SUPPORTED_IMAGE_GENERATION_PROVIDERS)
  provider: ModelProvider;

  @ApiProperty({
    description: 'The display name of the model',
    example: 'GPT Image 1',
  })
  @IsString()
  @IsNotEmpty()
  displayName: string;

  @ApiProperty({
    description: 'Whether the model is archived',
    example: false,
  })
  @IsBoolean()
  isArchived: boolean;

  @ApiPropertyOptional({
    description: 'Cost per million input tokens in EUR',
    example: 5,
    minimum: 0,
  })
  @Transform(nullToUndefined)
  @ValidateIf((o: BaseImageGenerationModelRequestDto) => hasAnyCostField(o))
  @IsNumber()
  @Min(0)
  inputTokenCost?: number;

  @ApiPropertyOptional({
    description: 'Cost per million output tokens in EUR',
    example: 40,
    minimum: 0,
  })
  @Transform(nullToUndefined)
  @ValidateIf((o: BaseImageGenerationModelRequestDto) => hasAnyCostField(o))
  @IsNumber()
  @Min(0)
  outputTokenCost?: number;
}
