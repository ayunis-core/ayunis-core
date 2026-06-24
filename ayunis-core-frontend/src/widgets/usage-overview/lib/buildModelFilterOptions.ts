interface PermittedModel {
  id: string;
  provider: string;
  providerDisplayName: string;
  displayName: string;
}

interface FilterOption {
  value: string;
  label: string;
}

export interface ModelFilterOptions {
  providerOptions: FilterOption[];
  modelOptions: FilterOption[];
  /** Map of provider key -> human-readable display name, for chart legends. */
  providerDisplayNames: Record<string, string>;
}

/**
 * Builds provider/model select options and the provider display-name lookup
 * from a list of permitted models. Shared by the own-org and super-admin
 * usage surfaces, which expose the same permitted-model shape.
 */
export function buildModelFilterOptions(
  permittedModels: PermittedModel[] | undefined,
): ModelFilterOptions {
  if (!permittedModels?.length) {
    return { providerOptions: [], modelOptions: [], providerDisplayNames: {} };
  }

  const providerMap = new Map<string, string>();
  const modelMap = new Map<string, string>();
  for (const model of permittedModels) {
    if (!providerMap.has(model.provider)) {
      providerMap.set(model.provider, model.providerDisplayName);
    }
    if (!modelMap.has(model.id)) {
      modelMap.set(model.id, model.displayName);
    }
  }

  return {
    providerOptions: Array.from(providerMap.entries()).map(
      ([value, label]) => ({ value, label }),
    ),
    modelOptions: Array.from(modelMap.entries()).map(([value, label]) => ({
      value,
      label,
    })),
    providerDisplayNames: Object.fromEntries(providerMap),
  };
}
