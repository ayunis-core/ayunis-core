import { getHostingPriority } from '@/shared/lib/model-provider-metadata';
import {
  ModelMode,
  type DefaultModelSelectionResponseDto,
  type ModelModeResolutionResponseDto,
  type PermittedLanguageModelResponseDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export { ModelMode };
export const MODEL_MODES = Object.values(ModelMode);

const MODE_VALUE_PREFIX = 'mode:';

export function getModeValue(mode: ModelMode): string {
  return `${MODE_VALUE_PREFIX}${mode}`;
}

export function getModeFromValue(value: string | undefined): ModelMode | null {
  return MODEL_MODES.find((mode) => getModeValue(mode) === value) ?? null;
}

type SortableModel = Pick<
  PermittedLanguageModelResponseDto,
  'provider' | 'displayName' | 'tier'
>;

const TIER_RANK: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
  zero: 0,
};

function compareTier(a: SortableModel, b: SortableModel): number {
  return (TIER_RANK[b.tier ?? ''] ?? -1) - (TIER_RANK[a.tier ?? ''] ?? -1);
}

export function compareModels(a: SortableModel, b: SortableModel): number {
  const hostingA = getHostingPriority(a.provider);
  const hostingB = getHostingPriority(b.provider);
  if (hostingA !== hostingB) return hostingA - hostingB;

  const tier = compareTier(a, b);
  if (tier !== 0) return tier;

  return a.displayName.localeCompare(b.displayName);
}

/** The permitted model the backend will bind for `mode` right now. */
export function resolveModeModel<T extends { id: string }>(
  mode: ModelMode,
  models: T[],
  resolutions: ModelModeResolutionResponseDto[],
  isAnonymous = false,
): T | undefined {
  const resolution = resolutions.find((r) => r.mode === mode);
  const id = isAnonymous
    ? resolution?.anonymousPermittedModelId
    : resolution?.permittedModelId;
  return id ? models.find((model) => model.id === id) : undefined;
}

export function resolveSelectedModel<T extends { id: string }>(
  value: string | undefined,
  models: T[],
  resolutions: ModelModeResolutionResponseDto[],
  isAnonymous = false,
  defaultSelection?: DefaultModelSelectionResponseDto,
): {
  model: T | undefined;
  modelId: string | undefined;
  mode: ModelMode | null;
} {
  const mode = getModeFromValue(value);
  if (!mode) {
    return {
      model: models.find((model) => model.id === value),
      modelId: value,
      mode: null,
    };
  }
  // The backend binds the mode at chat creation; until resolutions arrive (or
  // if they fail), the default selection already names the model it resolved to.
  if (resolutions.some((r) => r.mode === mode)) {
    const model = resolveModeModel(mode, models, resolutions, isAnonymous);
    return { model, modelId: model?.id, mode };
  }
  if (defaultSelection?.mode === mode) {
    const modelId = defaultSelection.permittedModelId;
    return { model: models.find((m) => m.id === modelId), modelId, mode };
  }
  return { model: undefined, modelId: undefined, mode };
}
