import { PiiCategory } from '../../domain/pii-category.enum';

const PRESIDIO_ENTITY_TO_CATEGORY: Record<string, PiiCategory> = {
  PERSON: PiiCategory.PERSON_NAME,
  ORGANIZATION: PiiCategory.ORGANIZATION,
  LOCATION: PiiCategory.LOCATION,
  EMAIL_ADDRESS: PiiCategory.EMAIL_ADDRESS,
  PHONE_NUMBER: PiiCategory.PHONE_NUMBER,
  URL: PiiCategory.URL_OR_IP,
  IP_ADDRESS: PiiCategory.URL_OR_IP,
  DATE_TIME: PiiCategory.DATE_TIME,
  CREDIT_CARD: PiiCategory.FINANCIAL_ACCOUNT,
  IBAN_CODE: PiiCategory.FINANCIAL_ACCOUNT,
  US_BANK_NUMBER: PiiCategory.FINANCIAL_ACCOUNT,
  US_SSN: PiiCategory.GOVERNMENT_ID,
  PASSPORT: PiiCategory.GOVERNMENT_ID,
  US_DRIVER_LICENSE: PiiCategory.GOVERNMENT_ID,
  MEDICAL_LICENSE: PiiCategory.GOVERNMENT_ID,
  NRP: PiiCategory.NATIONALITY_RELIGION_POLITICS,
};

/**
 * Unmapped types return undefined, which the whitelist filter treats as
 * never exemptable (fail-safe for entity types added to the engine later).
 */
export function mapPresidioEntityToCategory(
  entityType: string,
): PiiCategory | undefined {
  return PRESIDIO_ENTITY_TO_CATEGORY[entityType];
}
