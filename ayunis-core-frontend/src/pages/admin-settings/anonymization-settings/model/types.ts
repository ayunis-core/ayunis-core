import type { PiiCategory } from '@ayunis/api-client';

export { PII_CATEGORIES } from '@/shared/lib/pii-categories';

export interface CategoryRowState {
  enabled: boolean;
  pattern: string;
}

export type RowsState = Record<PiiCategory, CategoryRowState>;
