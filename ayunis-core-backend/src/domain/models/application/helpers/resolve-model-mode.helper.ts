import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import type { ModelModeEntry } from 'src/domain/models/domain/model-mode-entry.entity';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';

/**
 * First enabled entry the caller may use right now. Auto degrades to a
 * faulted model rather than failing; Max does not.
 */
export function resolveModelMode(
  mode: ModelMode,
  entries: ModelModeEntry[],
  permits: PermittedLanguageModel[],
  isAnonymous: boolean,
): PermittedLanguageModel | null {
  const permitByModelId = new Map(permits.map((p) => [p.model.id, p]));
  const candidates = entries
    .filter((e) => e.enabled && !e.model.isArchived)
    // Tier is checked when the list is saved, but a model can be re-tiered later.
    .filter((e) => mode !== ModelMode.MAX || e.model.tier === ModelTier.HIGH)
    .map((e) => permitByModelId.get(e.model.id))
    .filter(
      (p): p is PermittedLanguageModel =>
        p !== undefined && (isAnonymous || !p.anonymousOnly),
    );

  const healthy = candidates.find((p) => !p.model.hasProviderFault);
  if (healthy) return healthy;
  return mode === ModelMode.AUTO ? (candidates[0] ?? null) : null;
}
