import type { PiiCategory } from '../../domain/pii-category.enum';
import type { PiiDetection } from '../../domain/pii-detection';
import type { PiiMask } from '../../domain/pii-mask';

export interface AnonymizationReplacement {
  entityType: string;
  category: PiiCategory;
  originalValue: string;
  start: number;
  end: number;
  score: number;
}

export interface AnonymizationResult {
  originalText: string;
  anonymizedText: string;
  replacements: AnonymizationReplacement[];
  /** Masks newly created for this text; empty in legacy placeholder mode. */
  newMasks: PiiMask[];
}

/**
 * Detection-only engine port. Adapters detect PII spans (non-overlapping)
 * and map their engine-specific entity types onto the PiiCategory taxonomy;
 * whitelist filtering and placeholder replacement happen in the application
 * layer.
 */
export abstract class AnonymizationPort {
  abstract detect(text: string, entities?: string[]): Promise<PiiDetection[]>;
}
