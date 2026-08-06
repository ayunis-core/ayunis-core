import type { PiiCategory } from '@/shared/api';
import type { GlobalPiiWhitelistWordDto } from '@/shared/api';

export type WordsByCategory = Partial<
  Record<PiiCategory, GlobalPiiWhitelistWordDto[]>
>;
