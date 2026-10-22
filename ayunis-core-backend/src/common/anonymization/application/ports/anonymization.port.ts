import type { DetectionMeasurementContext } from 'src/common/anonymization/domain/detection-measurement-context';
import type { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import type { PiiDetection } from 'src/common/anonymization/domain/pii-detection';
import type { PiiMask } from 'src/common/anonymization/domain/pii-mask';

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
  abstract detect(
    text: string,
    entities?: string[],
    context?: DetectionMeasurementContext,
  ): Promise<PiiDetection[]>;
}
