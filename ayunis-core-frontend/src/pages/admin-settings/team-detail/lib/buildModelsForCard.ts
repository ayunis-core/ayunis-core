import type {
  ModelWithConfigResponseDto,
  PermittedImageGenerationModelResponseDto,
  PermittedLanguageModelResponseDto,
} from '@/shared/api';

export type TeamPermittedModel =
  PermittedLanguageModelResponseDto | PermittedImageGenerationModelResponseDto;

export function buildModelsForCard(
  orgModels: ModelWithConfigResponseDto[],
  teamPermittedModels: TeamPermittedModel[],
): ModelWithConfigResponseDto[] {
  const permittedByModelId = new Map(
    teamPermittedModels.map((model) => [model.modelId, model]),
  );
  return orgModels
    .filter((model) => model.isPermitted)
    .map((model) => {
      const teamModel = permittedByModelId.get(model.modelId);
      return {
        ...model,
        isPermitted: teamModel !== undefined,
        isDefault: false,
        permittedModelId: teamModel?.id ?? null,
        anonymousOnly: teamModel?.anonymousOnly ?? null,
        internetAccessEnabled:
          teamModel?.type === 'language'
            ? teamModel.internetAccessEnabled
            : undefined,
      };
    });
}
