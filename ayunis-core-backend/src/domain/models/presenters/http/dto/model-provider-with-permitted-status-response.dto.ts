import { ApiProperty } from '@nestjs/swagger';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelProviderLocation } from 'src/domain/models/domain/value-objects/model-provider-locations.enum';

export class ModelProviderWithPermittedStatusResponseDto {
  @ApiProperty({
    type: 'string',
    enum: Object.values(ModelProvider),
    description: 'The model provider identifier',
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

  @ApiProperty({
    type: 'boolean',
    description: 'Whether this provider is permitted for the organization',
    example: true,
  })
  isPermitted: boolean;
}
