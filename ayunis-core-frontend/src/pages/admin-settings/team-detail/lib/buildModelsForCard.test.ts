import { describe, expect, it } from 'vitest';
import type {
  ModelWithConfigResponseDto,
  PermittedLanguageModelResponseDto,
} from '@/shared/api';
import { buildModelsForCard } from './buildModelsForCard';

const orgModel = {
  modelId: '123e4567-e89b-12d3-a456-426614174001',
  permittedModelId: '123e4567-e89b-12d3-a456-426614174002',
  type: 'language',
  isPermitted: true,
  internetAccessEnabled: true,
} as ModelWithConfigResponseDto;

const teamModel = {
  id: '123e4567-e89b-12d3-a456-426614174003',
  modelId: orgModel.modelId,
  type: 'language',
  anonymousOnly: false,
  internetAccessEnabled: false,
} as PermittedLanguageModelResponseDto;

describe('buildModelsForCard', () => {
  it('uses an explicit team internet restriction instead of the organization policy', () => {
    const [model] = buildModelsForCard([orgModel], [teamModel]);

    expect(model.internetAccessEnabled).toBe(false);
  });
});
