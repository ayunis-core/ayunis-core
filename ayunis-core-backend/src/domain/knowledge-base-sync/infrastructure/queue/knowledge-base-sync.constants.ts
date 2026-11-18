export const KNOWLEDGE_BASE_SYNC_QUEUE = 'knowledge-base-sync';

export const SYNCED_FILE_JOB = 'sync-file';
export const SYNC_RUN_JOB = 'sync-location';
export const SYNC_DUE_LOCATIONS_JOB = 'sync-due-locations';
export const SYNC_DUE_LOCATIONS_SCHEDULER_ID = 'sync-due-locations';
export const SYNC_DUE_LOCATIONS_INTERVAL_MS = 60_000;

/**
 * BullMQ takes jobs without a priority before prioritized ones, so syncs and
 * the due-location sweep go ahead of the files already queued.
 */
export const SYNCED_FILE_JOB_PRIORITY = 1;
