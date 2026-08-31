import { describe, expect, it } from 'vitest';
import type {
  ModelWithConfigResponseDto,
  PermittedLanguageModelResponseDto,
} from '@/shared/api';
import { buildTeamModelsForCard } from './buildTeamModelsForCard';

const candidate = (
  modelId: string,
  isPermitted: boolean,
): ModelWithConfigResponseDto => ({
  modelId,
  permittedModelId: isPermitted ? `org-permit-${modelId}` : null,
  name: `model-${modelId}`,
  provider: 'openai',
  displayName: `Model ${modelId}`,
  type: 'language',
  canStream: true,
  isReasoning: false,
  canUseTools: true,
  canVision: false,
  isPermitted,
  isDefault: isPermitted,
  anonymousOnly: isPermitted ? false : null,
});

const grant = (
  modelId: string,
  overrides: Partial<PermittedLanguageModelResponseDto> = {},
): PermittedLanguageModelResponseDto => ({
  id: `team-permit-${modelId}`,
  name: `model-${modelId}`,
  provider: 'openai',
  providerDisplayName: 'OpenAI',
  displayName: `Model ${modelId}`,
  isArchived: false,
  modelId,
  type: 'language',
  canStream: true,
  isReasoning: false,
  canVision: false,
  hasProviderFault: false,
  isDefault: false,
  anonymousOnly: false,
  ...overrides,
});

describe(buildTeamModelsForCard.name, () => {
  it('keeps organization-permitted and unpermitted configured candidates visible', () => {
    const result = buildTeamModelsForCard(
      [candidate('org-model', true), candidate('team-only-model', false)],
      [],
    );

    expect(result.map(({ modelId }) => modelId)).toEqual([
      'org-model',
      'team-only-model',
    ]);
    expect(result.every(({ isPermitted }) => !isPermitted)).toBe(true);
    expect(
      result.every(({ permittedModelId }) => permittedModelId === null),
    ).toBe(true);
  });

  it('maps only explicit grants with team-owned metadata', () => {
    const result = buildTeamModelsForCard(
      [candidate('org-model', true), candidate('team-model', false)],
      [grant('team-model', { anonymousOnly: true, isDefault: true })],
    );

    expect(result[0]).toMatchObject({
      modelId: 'org-model',
      isPermitted: false,
      isDefault: false,
      permittedModelId: null,
      anonymousOnly: null,
    });
    expect(result[1]).toMatchObject({
      modelId: 'team-model',
      isPermitted: true,
      isDefault: true,
      permittedModelId: 'team-permit-team-model',
      anonymousOnly: true,
    });
  });
});
