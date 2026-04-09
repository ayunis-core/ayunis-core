import { CatalogModelResponseDtoMapper } from './catalog-model-response-dto.mapper';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelType } from 'src/domain/models/domain/value-objects/model-type.enum';
import type { UUID } from 'crypto';

describe('CatalogModelResponseDtoMapper', () => {
  const mapper = new CatalogModelResponseDtoMapper();

  it('maps image-generation catalog models to DTOs', () => {
    const model = new ImageGenerationModel({
      id: '123e4567-e89b-12d3-a456-426614174000' as UUID,
      name: 'gpt-image-1',
      provider: ModelProvider.AZURE,
      displayName: 'GPT Image 1',
      isArchived: false,
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-02T00:00:00Z'),
    });

    const dto = mapper.toDto(model);

    expect(dto).toMatchObject({
      id: model.id,
      name: 'gpt-image-1',
      provider: ModelProvider.AZURE,
      displayName: 'GPT Image 1',
      type: ModelType.IMAGE_GENERATION,
      isArchived: false,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    });
  });
});
