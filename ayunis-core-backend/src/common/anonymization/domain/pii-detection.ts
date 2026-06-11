import type { PiiCategory } from './pii-category.enum';

export interface PiiDetection {
  /** Engine-specific entity type, e.g. Presidio's `IBAN_CODE`. */
  entityType: string;
  /** Engine-agnostic category; undefined when the engine emits an unmapped type. */
  category?: PiiCategory;
  /** The detected span text. */
  text: string;
  start: number;
  end: number;
  score: number;
}
