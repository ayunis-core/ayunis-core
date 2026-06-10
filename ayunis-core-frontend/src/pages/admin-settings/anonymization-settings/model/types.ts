import { PiiCategory } from '@/shared/api';

/** Fixed display order of all PII categories. */
export const PII_CATEGORIES: PiiCategory[] = [
  PiiCategory.person_name,
  PiiCategory.organization,
  PiiCategory.location,
  PiiCategory.email_address,
  PiiCategory.phone_number,
  PiiCategory.url_or_ip,
  PiiCategory.date_time,
  PiiCategory.financial_account,
  PiiCategory.government_id,
  PiiCategory.nationality_religion_politics,
];

export interface CategoryRowState {
  enabled: boolean;
  pattern: string;
}

export type RowsState = Record<PiiCategory, CategoryRowState>;
