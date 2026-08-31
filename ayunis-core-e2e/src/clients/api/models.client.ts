import type { APIRequestContext } from '@playwright/test';
import type {
  LanguageModelResponseDto,
  LanguageModelResponseDtoProvider,
  ModelWithConfigResponseDto,
  PermittedImageGenerationModelResponseDto,
  PermittedLanguageModelResponseDto,
} from '../generated/ayunisCoreAPI.schemas';
import { generatedApi } from './generated-api';

export interface DefaultModel {
  name: string;
  provider: LanguageModelResponseDtoProvider;
}

interface CreateLanguageCatalogModelInput {
  name: string;
  displayName: string;
  provider?: LanguageModelResponseDtoProvider;
}

export async function createLanguageCatalogModel(
  api: APIRequestContext,
  input: CreateLanguageCatalogModelInput,
): Promise<LanguageModelResponseDto> {
  return generatedApi.superAdminLanguageCatalogModelsControllerCreateLanguageModel(
    {
      ...input,
      provider: input.provider ?? 'openai',
      canStream: true,
      canUseTools: false,
      isReasoning: false,
      canVision: false,
      isArchived: false,
      hasProviderFault: false,
    },
    { api },
  );
}

export async function deleteCatalogModel(
  api: APIRequestContext,
  modelId: string,
): Promise<void> {
  await generatedApi.superAdminCatalogModelsControllerDeleteCatalogModel(
    modelId,
    { api },
  );
}

export async function permitLanguageModel(
  api: APIRequestContext,
  modelId: string,
): Promise<PermittedLanguageModelResponseDto> {
  await generatedApi.modelsControllerCreatePermittedModel({ modelId }, { api });
  const permittedModel = (
    await generatedApi.modelsControllerGetOrgPermittedLanguageModels({ api })
  ).find((model) => model.modelId === modelId);
  if (!permittedModel) {
    throw new Error(`Permitted language model ${modelId} was not returned`);
  }
  return permittedModel;
}

export async function removePermittedModel(
  api: APIRequestContext,
  permittedModelId: string,
): Promise<void> {
  await generatedApi.modelsControllerDeletePermittedModel(permittedModelId, {
    api,
  });
}

export function getConfiguredLanguageCandidates(
  api: APIRequestContext,
): Promise<ModelWithConfigResponseDto[]> {
  return generatedApi.modelsControllerGetAvailableLanguageModels({ api });
}

export function getConfiguredImageCandidates(
  api: APIRequestContext,
): Promise<ModelWithConfigResponseDto[]> {
  return generatedApi.modelsControllerGetAvailableImageGenerationModels({ api });
}

export function getEffectiveLanguageModels(
  api: APIRequestContext,
): Promise<PermittedLanguageModelResponseDto[]> {
  return generatedApi.modelsControllerGetPermittedLanguageModels({ api });
}

export function getEffectiveDefaultModel(
  api: APIRequestContext,
): Promise<PermittedLanguageModelResponseDto | null> {
  return generatedApi
    .modelsDefaultsControllerGetEffectiveDefaultModel({ api })
    .then((response) => response.permittedLanguageModel);
}

export function getTeamLanguageGrants(
  api: APIRequestContext,
  teamId: string,
): Promise<PermittedLanguageModelResponseDto[]> {
  return generatedApi.teamPermittedModelsControllerListTeamPermittedModels(
    teamId,
    { api },
  );
}

export function getTeamImageGrants(
  api: APIRequestContext,
  teamId: string,
): Promise<PermittedImageGenerationModelResponseDto[]> {
  return generatedApi.teamPermittedModelsControllerListTeamImageGenerationModels(
    teamId,
    { api },
  );
}

export async function permitFirstLanguageModelAsDefault(
  api: APIRequestContext,
): Promise<DefaultModel> {
  const model = (await generatedApi.modelsControllerGetAvailableLanguageModels({ api }))[0];
  if (!model) {
    throw new Error(
      'No language models available — seed the stack first: (cd ayunis-core-backend && pnpm seed)',
    );
  }

  await generatedApi.modelsControllerCreatePermittedModel(
    { modelId: model.modelId },
    { api },
  );

  const permittedModelId = (
    await generatedApi.modelsControllerGetAvailableLanguageModels({ api })
  ).find((m) => m.modelId === model.modelId)?.permittedModelId;
  if (!permittedModelId) {
    throw new Error(`Model ${model.name} was permitted but has no permittedModelId`);
  }

  await generatedApi.modelsDefaultsControllerManageOrgDefaultModel(
    { permittedModelId },
    { api },
  );

  return { name: model.name, provider: model.provider };
}
