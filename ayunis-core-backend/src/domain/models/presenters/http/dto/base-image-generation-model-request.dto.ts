import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsString } from 'class-validator';
import { SUPPORTED_IMAGE_GENERATION_PROVIDERS } from 'src/domain/models/application/services/model-policy.service';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';

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
}
