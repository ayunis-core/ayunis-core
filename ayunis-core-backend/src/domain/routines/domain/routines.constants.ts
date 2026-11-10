export const ROUTINE_NAME_MAX_LENGTH = 100;
export const ROUTINE_PROMPT_MAX_LENGTH = 10_000;
/** Daily run time as HH:mm (24h); interpreted in {@link ROUTINE_TIME_ZONE}. */
export const ROUTINE_DAILY_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
export const ROUTINE_FAILURE_REASON_MAX_LENGTH = 100;
export const ROUTINE_TIME_ZONE = 'Europe/Berlin';
export const ROUTINE_EXECUTION_KEY_MAX_LENGTH = 100;
export const ROUTINE_SOURCE_TOOL_CALL_ID_MAX_LENGTH = 255;
/** Scheduled starts are spread over this many minutes after the daily time. */
export const ROUTINE_START_SPREAD_MINUTES = 10;
/** Consecutive failed runs after which an enabled routine is paused. */
export const ROUTINE_PAUSE_AFTER_FAILURES = 3;
