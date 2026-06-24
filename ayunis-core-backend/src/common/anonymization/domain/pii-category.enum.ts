/**
 * Engine-agnostic PII category taxonomy.
 *
 * Each anonymization engine adapter maps its own entity types onto these
 * categories (see e.g. presidio-entity-category.mapper.ts). The mapping must
 * be total in the engine→category direction; engine types without an explicit
 * mapping fall back to OTHER, and categories without a mapping on the current
 * engine are simply dormant.
 */
export enum PiiCategory {
  PERSON_NAME = 'person_name',
  ORGANIZATION = 'organization',
  LOCATION = 'location',
  EMAIL_ADDRESS = 'email_address',
  PHONE_NUMBER = 'phone_number',
  URL_OR_IP = 'url_or_ip',
  DATE_TIME = 'date_time',
  FINANCIAL_ACCOUNT = 'financial_account',
  GOVERNMENT_ID = 'government_id',
  NATIONALITY_RELIGION_POLITICS = 'nationality_religion_politics',
  OTHER = 'other',
}
