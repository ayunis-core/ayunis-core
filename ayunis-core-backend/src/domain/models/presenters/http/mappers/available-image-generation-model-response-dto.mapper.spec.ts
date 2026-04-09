import type { UUID } from 'crypto';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { PermittedImageGenerationModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import { AvailableImageGenerationModelResponseDtoMapper } from './available-image-generation-model-response-dto.mapper';

describe('AvailableImageGenerationModelResponseDtoMapper', () => {
  const mapper = new AvailableImageGenerationModelResponseDtoMapper();

  it('maps image-generation availability without using legacy language flags', () => {
    const model = new ImageGenerationModel({
      id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
      name: 'gpt-image-1',
      provider: ModelProvider.AZURE,
      displayName: 'GPT Image 1',
      isArchived: false,
    });
    const permittedModel = new PermittedImageGenerationModel({
      id: '123e4567-e89b-12d3-a456-426614174001' as UUID,
      model,
      orgId: '123e4567-e89b-12d3-a456-426614174002' as UUID,
      anonymousOnly: true,
    });

    const dto = mapper.toDto([model], [permittedModel]);

    expect(dto).toStrictEqual([
      {
        modelId: model.id,
        permittedModelId: permittedModel.id,
        name: 'gpt-image-1',
        provider: ModelProvider.AZURE,
        displayName: 'GPT Image 1',
        type: ModelType.IMAGE_GENERATION,
        isPermitted: true,
        anonymousOnly: true,
      },
    ]);
  });
});
