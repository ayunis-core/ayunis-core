interface EffectiveModel {
  id: string;
  modelId: string;
}

interface ThreadModelReference {
  permittedModelId?: string;
  modelId?: string;
}

export function findThreadModel<T extends EffectiveModel>(
  models: readonly T[],
  thread: ThreadModelReference,
): T | undefined {
  if (thread.modelId) {
    return models.find((model) => model.modelId === thread.modelId);
  }
  return models.find((model) => model.id === thread.permittedModelId);
}
