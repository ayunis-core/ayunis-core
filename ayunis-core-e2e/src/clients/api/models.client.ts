import type { APIRequestContext } from '@playwright/test';
import type {
  LanguageModelResponseDto,
  LanguageModelResponseDtoProvider,
  ModelWithConfigResponseDto,
  PermittedImageGenerationModelResponseDto,
  PermittedLanguageModelResponseDto,
} from '../generated/ayunisCoreAPI.schemas';
import { config } from '../../config';
import { generatedApi } from './generated-api';

export interface DefaultModel {
  name: string;
  provider: LanguageModelResponseDtoProvider;
}

interface CreateLanguageCatalogModelInput {
  name: string;
  displayName: string;
  provider?: LanguageModelResponseDtoProvider;
  contextWindowSize?: number;
}

export async function createLanguageCatalogModel(
  api: APIRequestContext,
  input: CreateLanguageCatalogModelInput,
): Promise<LanguageModelResponseDto> {
  return generatedApi.superAdminLanguageCatalogModelsControllerCreateLanguageModel(
    {
      ...input,
      provider: input.provider ?? 'openai',
      contextWindowSize: input.contextWindowSize ?? 128_000,
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

/** For a model with recorded usage, which can no longer be deleted. */
export async function archiveLanguageCatalogModel(
  api: APIRequestContext,
  model: LanguageModelResponseDto,
): Promise<void> {
  await generatedApi.superAdminLanguageCatalogModelsControllerUpdateLanguageModel(
    model.id,
    {
      name: model.name,
      displayName: model.displayName,
      provider: model.provider,
      contextWindowSize: model.contextWindowSize,
      canStream: model.canStream,
      canUseTools: model.canUseTools,
      isReasoning: model.isReasoning,
      canVision: model.canVision,
      hasProviderFault: false,
      isArchived: true,
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

/** Permits a configured language model the organization does not have yet. */
export async function permitAnotherLanguageModel(
  api: APIRequestContext,
): Promise<PermittedLanguageModelResponseDto> {
  const candidate = (await getConfiguredLanguageCandidates(api)).find(
    (model) => !model.isPermitted,
  );
  if (!candidate) throw new Error('No unpermitted language model left');
  return permitLanguageModel(api, candidate.modelId);
}

export async function removePermittedModel(
  api: APIRequestContext,
  permittedModelId: string,
): Promise<void> {
  await generatedApi.modelsControllerDeletePermittedModel(permittedModelId, {
    api,
  });
}

export async function setPermittedModelAnonymousOnly(
  api: APIRequestContext,
  permittedModelId: string,
  anonymousOnly: boolean,
): Promise<void> {
  await generatedApi.modelsControllerUpdatePermittedModel(
    permittedModelId,
    { anonymousOnly },
    { api },
  );
}

export async function grantTeamLanguageModel(
  api: APIRequestContext,
  teamId: string,
  modelId: string,
): Promise<string> {
  const grant =
    await generatedApi.teamPermittedModelsControllerCreateTeamPermittedModel(
      teamId,
      { modelId },
      { api },
    );
  return grant.id;
}

export async function setMemoryAccess(
  api: APIRequestContext,
  permittedModelId: string,
  memoryAccess: boolean,
): Promise<void> {
  await generatedApi.modelsControllerUpdatePermittedModel(
    permittedModelId,
    { memoryAccess },
    { api },
  );
}

export async function setChatHistoryAccess(
  api: APIRequestContext,
  permittedModelId: string,
  chatHistoryAccess: boolean,
): Promise<void> {
  await generatedApi.modelsControllerUpdatePermittedModel(
    permittedModelId,
    { chatHistoryAccess },
    { api },
  );
}

export async function getOrgLanguageGrant(
  api: APIRequestContext,
  permittedModelId: string,
): Promise<PermittedLanguageModelResponseDto> {
  const grant = (
    await generatedApi.modelsControllerGetOrgPermittedLanguageModels({ api })
  ).find((model) => model.id === permittedModelId);
  if (!grant) throw new Error(`No org grant ${permittedModelId}`);
  return grant;
}

// Raw request for asserting the status of a change that may be denied.
export function requestMemoryAccessChange(
  api: APIRequestContext,
  permittedModelId: string,
  memoryAccess: boolean,
) {
  return api.patch(`${config.apiURL}/api/models/permitted/${permittedModelId}`, {
    data: { memoryAccess },
  });
}

export function requestChatHistoryAccessChange(
  api: APIRequestContext,
  permittedModelId: string,
  chatHistoryAccess: boolean,
) {
  return api.patch(`${config.apiURL}/api/models/permitted/${permittedModelId}`, {
    data: { chatHistoryAccess },
  });
}

export function getConfiguredLanguageCandidates(
  api: APIRequestContext,
): Promise<ModelWithConfigResponseDto[]> {
  return generatedApi.modelsControllerGetAvailableLanguageModels({ api });
}

/** A configured catalog model the organization has not enabled yet. */
export async function findUnpermittedLanguageCandidate(
  api: APIRequestContext,
): Promise<ModelWithConfigResponseDto> {
  const candidate = (await getConfiguredLanguageCandidates(api)).find(
    (model) => !model.isPermitted,
  );
  if (!candidate) {
    throw new Error('No configured organization-unpermitted language candidate');
  }
  return candidate;
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

export async function setOrgDefaultModel(
  api: APIRequestContext,
  permittedModelId: string,
): Promise<void> {
  await generatedApi.modelsDefaultsControllerManageOrgDefaultModel(
    { permittedModelId },
    { api },
  );
}

export async function setUserDefaultModel(
  api: APIRequestContext,
  permittedModelId: string,
): Promise<void> {
  await generatedApi.modelsDefaultsControllerManageUserDefaultModel(
    { permittedModelId },
    { api },
  );
}

export async function removeUserDefaultModel(api: APIRequestContext): Promise<void> {
  await generatedApi.modelsDefaultsControllerDeleteUserDefaultModel({ api });
}

// Chat file uploads need a permitted embedding model in the org.
export async function permitEmbeddingModel(api: APIRequestContext): Promise<void> {
  const model = (
    await generatedApi.modelsControllerGetAvailableEmbeddingModels({ api })
  )[0];
  if (!model) throw new Error('No embedding model is available');
  if (!model.permittedModelId) {
    await generatedApi.modelsControllerCreatePermittedModel(
      { modelId: model.modelId },
      { api },
    );
  }
}
