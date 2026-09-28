import { getHostingPriority } from '@/shared/lib/model-provider-metadata';
import type { PermittedLanguageModelResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export const MODEL_MODES = ['auto', 'max'] as const;
export type ModelMode = (typeof MODEL_MODES)[number];

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

type ResolvableModel = SortableModel &
  Partial<
    Pick<
      PermittedLanguageModelResponseDto,
      'hasProviderFault' | 'anonymousOnly'
    >
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

function isUsable(model: ResolvableModel, isAnonymous: boolean): boolean {
  return !model.hasProviderFault && (isAnonymous || !model.anonymousOnly);
}

export function resolveModeModel<T extends ResolvableModel>(
  mode: ModelMode,
  models: T[],
  isAnonymous = false,
): T | undefined {
  const sorted = [...models].sort(compareModels);
  if (mode === 'max') {
    return sorted.find(
      (model) => model.tier === 'high' && isUsable(model, isAnonymous),
    );
  }
  return (
    sorted.find((model) => isUsable(model, isAnonymous)) ??
    sorted.find((model) => isAnonymous || !model.anonymousOnly)
  );
}

export function resolveSelectedModel<
  T extends ResolvableModel & { id: string },
>(
  value: string | undefined,
  models: T[],
  isAnonymous = false,
): { model: T | undefined; modelId: string | undefined; isMode: boolean } {
  const mode = getModeFromValue(value);
  if (!mode) {
    return {
      model: models.find((model) => model.id === value),
      modelId: value,
      isMode: false,
    };
  }
  const model = resolveModeModel(mode, models, isAnonymous);
  return { model, modelId: model?.id, isMode: true };
}
