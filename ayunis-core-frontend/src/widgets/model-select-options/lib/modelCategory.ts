export type ModelCategory = 'fast' | 'balanced' | 'powerful';

const TIER_TO_CATEGORY: Record<string, ModelCategory> = {
  zero: 'fast',
  low: 'fast',
  medium: 'balanced',
  high: 'powerful',
};

export function getModelCategory(
  tier: string | null | undefined,
): ModelCategory | undefined {
  return tier ? TIER_TO_CATEGORY[tier] : undefined;
}
