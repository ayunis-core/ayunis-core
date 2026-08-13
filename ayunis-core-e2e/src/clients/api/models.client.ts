import type { APIRequestContext } from '@playwright/test';
import { generatedApi } from './generated-api';

export interface DefaultModel {
  name: string;
  provider: string;
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
