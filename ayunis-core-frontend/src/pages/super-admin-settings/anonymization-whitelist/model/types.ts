import type { PiiCategory } from '@ayunis/api-client';
import type { GlobalPiiWhitelistWordDto } from '@ayunis/api-client';

export type WordsByCategory = Partial<
  Record<PiiCategory, GlobalPiiWhitelistWordDto[]>
>;
