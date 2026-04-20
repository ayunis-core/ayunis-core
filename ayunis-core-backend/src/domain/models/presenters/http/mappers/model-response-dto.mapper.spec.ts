import { ModelResponseDtoMapper } from './model-response-dto.mapper';
import { PermittedImageGenerationModel } from 'src/domain/models/domain/permitted-model.entity';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import type { UUID } from 'crypto';

describe('ModelResponseDtoMapper', () => {
  const modelProviderInfoRegistry = {
    getModelProviderInfo: jest.fn().mockReturnValue({
      displayName: 'Azure OpenAI',
    }),
  };

  const mapper = new ModelResponseDtoMapper(modelProviderInfoRegistry as never);

  it('maps permitted image-generation models to DTOs', () => {
    const model = new ImageGenerationModel({
      id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
      name: 'gpt-image-1',
      provider: ModelProvider.AZURE,
      displayName: 'GPT Image 1',
      isArchived: false,
    });
    const permittedModel = new PermittedImageGenerationModel({
      id: '123e4567-e89b-12d3-a456-426614174111' as UUID,
      model,
      orgId: '123e4567-e89b-12d3-a456-426614174222' as UUID,
      anonymousOnly: true,
    });

    const dto = mapper.toDto(permittedModel);

    expect(dto).toMatchObject({
      id: permittedModel.id,
      modelId: model.id,
      name: 'gpt-image-1',
      provider: ModelProvider.AZURE,
      providerDisplayName: 'Azure OpenAI',
      displayName: 'GPT Image 1',
      type: ModelType.IMAGE_GENERATION,
      anonymousOnly: true,
      isArchived: false,
    });
  });
});
