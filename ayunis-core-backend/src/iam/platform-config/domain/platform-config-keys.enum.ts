export enum PlatformConfigKey {
  CREDITS_PER_EURO = 'CREDITS_PER_EURO',
  // ZERO-tier rows are persisted alongside the configurable tiers so the
  // super-admin UI can round-trip values like any other tier. They are
  // never *read* by the runtime fair-use check — `tierToFairUseQuotaType`
  // returns `null` for ZERO and the quota call is skipped — so these
  // values are effectively informational. Storing them keeps the UI
  // exhaustive over `ModelTier` without special-casing ZERO.
  FAIR_USE_ZERO_LIMIT = 'FAIR_USE_ZERO_LIMIT',
  FAIR_USE_ZERO_WINDOW_MS = 'FAIR_USE_ZERO_WINDOW_MS',
  FAIR_USE_LOW_LIMIT = 'FAIR_USE_LOW_LIMIT',
  FAIR_USE_LOW_WINDOW_MS = 'FAIR_USE_LOW_WINDOW_MS',
  FAIR_USE_MEDIUM_LIMIT = 'FAIR_USE_MEDIUM_LIMIT',
  FAIR_USE_MEDIUM_WINDOW_MS = 'FAIR_USE_MEDIUM_WINDOW_MS',
  FAIR_USE_HIGH_LIMIT = 'FAIR_USE_HIGH_LIMIT',
  FAIR_USE_HIGH_WINDOW_MS = 'FAIR_USE_HIGH_WINDOW_MS',
  FAIR_USE_IMAGES_LIMIT = 'FAIR_USE_IMAGES_LIMIT',
  FAIR_USE_IMAGES_WINDOW_MS = 'FAIR_USE_IMAGES_WINDOW_MS',
}
