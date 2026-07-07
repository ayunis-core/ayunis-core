/**
 * Budget-usage percentages that trigger a warning email to org admins.
 * Ordered ascending; the daily job emails only the highest newly-crossed
 * threshold but records all crossed ones so lower thresholds never re-fire.
 */
export const BUDGET_ALERT_THRESHOLDS: readonly number[] = [50, 80];

/** Frontend path to the admin credit-limits / usage settings page. */
export const CREDIT_LIMITS_SETTINGS_PATH = '/admin-settings/usage';
