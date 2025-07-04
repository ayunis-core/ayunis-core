import { ApiProperty } from '@nestjs/swagger';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelProviderLocation } from 'src/domain/models/domain/value-objects/model-provider-locations.enum';

export class PermittedProviderResponseDto {
  @ApiProperty({
    type: 'string',
    enum: Object.values(ModelProvider),
    description: 'The permitted model provider',
    example: ModelProvider.OPENAI,
  })
  provider: ModelProvider;

  @ApiProperty({
    type: 'string',
    description: 'The display name of the model provider',
    example: 'OpenAI',
  })
  displayName: string;

  @ApiProperty({
    type: 'string',
    enum: Object.values(ModelProviderLocation),
    description: 'The location where the provider hosts their services',
    example: ModelProviderLocation.US,
  })
  hostedIn: ModelProviderLocation;
}
