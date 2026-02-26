export const UsageConstants = {
  ACTIVE_USER_DAYS_THRESHOLD: 30,
  MAX_MODELS: 10,
  DEFAULT_USER_USAGE_LIMIT: 50,
  MAX_USER_USAGE_LIMIT: 1000,
  MAX_DATE_RANGE_DAYS: 730, // 2 years, guard against heavy queries
  GLOBAL_USER_USAGE_LIMIT: 20,
} as const;
