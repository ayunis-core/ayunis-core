import { ApiProperty } from '@nestjs/swagger';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.object';

export class ModelResponseDto {
  @ApiProperty({
    description: 'The ID of the model',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'The name of the model',
    example: 'gpt-4o',
  })
  name: string;

  @ApiProperty({
    description: 'The provider of the model',
    example: ModelProvider.MISTRAL,
    enum: ModelProvider,
  })
  provider: ModelProvider;

  @ApiProperty({
    description: 'The display name of the model',
    example: 'Mistral',
  })
  displayName: string;

  @ApiProperty({
    description: 'Whether the model can stream',
    example: true,
  })
  canStream: boolean;

  @ApiProperty({
    description: 'Whether the model can reason',
    example: true,
  })
  isReasoning: boolean;
}
