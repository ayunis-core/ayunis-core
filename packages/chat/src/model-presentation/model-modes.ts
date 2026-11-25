import { getHostingPriority } from './model-provider-metadata';
import {
  ModelMode,
  type DefaultModelSelectionResponseDto,
  type ModelModeResolutionResponseDto,
  type PermittedLanguageModelResponseDto,
} from '@ayunis/api-client/schemas';

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

/**
 * The permitted model the backend will bind for `mode` right now. Like chat
 * creation, a mode without a regular resolution binds its anonymous-only one.
 */
export function resolveModeModel<T extends { id: string }>(
  mode: ModelMode,
  models: T[],
  resolutions: ModelModeResolutionResponseDto[],
  isAnonymous = false,
): T | undefined {
  const resolution = resolutions.find((r) => r.mode === mode);
  const id = isAnonymous
    ? resolution?.anonymousPermittedModelId
    : (resolution?.permittedModelId ?? resolution?.anonymousPermittedModelId);
  return id ? models.find((model) => model.id === id) : undefined;
}

export function resolveSelectedModel<
  T extends { id: string; anonymousOnly?: boolean },
>(
  value: string | undefined,
  models: T[],
  resolutions: ModelModeResolutionResponseDto[],
  isAnonymous = false,
  defaultSelection?: DefaultModelSelectionResponseDto,
): {
  model: T | undefined;
  modelId: string | undefined;
  mode: ModelMode | null;
  /** The selection can only bind an anonymous-only model, so the chat must be anonymous. */
  isAnonymousEnforced: boolean;
} {
  const mode = getModeFromValue(value);
  if (!mode) {
    const model = models.find((model) => model.id === value);
    return {
      model,
      modelId: value,
      mode: null,
      isAnonymousEnforced: model?.anonymousOnly ?? false,
    };
  }
  return resolveSelectedMode({
    mode,
    models,
    resolutions,
    isAnonymous,
    defaultSelection,
  });
}

function resolveSelectedMode<
  T extends { id: string; anonymousOnly?: boolean },
>({
  mode,
  models,
  resolutions,
  isAnonymous,
  defaultSelection,
}: Readonly<{
  mode: ModelMode;
  models: T[];
  resolutions: ModelModeResolutionResponseDto[];
  isAnonymous: boolean;
  defaultSelection?: DefaultModelSelectionResponseDto;
}>) {
  // The backend binds the mode at chat creation; until resolutions arrive (or
  // if they fail), the default selection already names the model it resolved to.
  const resolution = resolutions.find((r) => r.mode === mode);
  if (resolution) {
    const isAnonymousEnforced =
      !resolution.permittedModelId && !!resolution.anonymousPermittedModelId;
    const model = resolveModeModel(mode, models, resolutions, isAnonymous);
    return { model, modelId: model?.id, mode, isAnonymousEnforced };
  }
  if (defaultSelection?.mode === mode) {
    const modelId = defaultSelection.permittedModelId;
    const model = models.find((m) => m.id === modelId);
    return {
      model,
      modelId,
      mode,
      isAnonymousEnforced: model?.anonymousOnly ?? false,
    };
  }
  return {
    model: undefined,
    modelId: undefined,
    mode,
    isAnonymousEnforced: false,
  };
}
