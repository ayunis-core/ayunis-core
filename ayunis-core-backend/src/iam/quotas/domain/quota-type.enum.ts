// NOTE: TS↔DB enum drift is intentional during this batch. The Postgres
// `usage_quotas_quotatype_enum` still carries a legacy `FAIR_USE_MESSAGES`
// value that is dropped by a follow-up migration after the legacy rows are
// deleted (step 11 of AYC-109). Do NOT add `FAIR_USE_MESSAGES` here, and
// discard any auto-generated migration that drops it from the DB enum.
export enum QuotaType {
  FAIR_USE_MESSAGES_LOW = 'FAIR_USE_MESSAGES_LOW',
  FAIR_USE_MESSAGES_MEDIUM = 'FAIR_USE_MESSAGES_MEDIUM',
  FAIR_USE_MESSAGES_HIGH = 'FAIR_USE_MESSAGES_HIGH',
}
