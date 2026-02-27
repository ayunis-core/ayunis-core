// Metric names — single source of truth for all Prometheus metric identifiers.
// Use these constants everywhere instead of magic strings.

export const METRICS_PATH = '/metrics';

export const AYUNIS_TOKENS_TOTAL = 'ayunis_tokens_total';
export const AYUNIS_INFERENCE_DURATION_SECONDS =
  'ayunis_inference_duration_seconds';
export const AYUNIS_INFERENCE_ERRORS_TOTAL = 'ayunis_inference_errors_total';
export const AYUNIS_MESSAGES_TOTAL = 'ayunis_messages_total';
export const AYUNIS_USER_ACTIVITY_TOTAL = 'ayunis_user_activity_total';
export const AYUNIS_THREAD_MESSAGE_COUNT = 'ayunis_thread_message_count';

// Shared label names
//
// NOTE on user_id cardinality: This is a municipal deployment targeting
// hundreds of users, not millions. Including user_id as a Prometheus label
// is acceptable at this scale. If user count grows significantly (10k+),
// revisit this decision — high-cardinality labels degrade Prometheus
// performance. Consider moving per-user metrics to logs or a dedicated
// analytics pipeline instead.
export const LABEL_USER_ID = 'user_id';
export const LABEL_ORG_ID = 'org_id';
export const LABEL_MODEL = 'model';
export const LABEL_PROVIDER = 'provider';
export const LABEL_DIRECTION = 'direction';
export const LABEL_ROLE = 'role';
export const LABEL_ERROR_TYPE = 'error_type';
export const LABEL_STREAMING = 'streaming';
