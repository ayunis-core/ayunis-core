import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsBoolean } from 'class-validator';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';

export class UpdateEmbeddingModelRequestDto {
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
}
