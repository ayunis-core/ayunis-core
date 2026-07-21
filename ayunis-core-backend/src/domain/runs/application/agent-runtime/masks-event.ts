/**
 * Name of the custom `RunEvent` the anonymization hook emits to stream the
 * thread's PII mask dictionary. The run-event → stream adapter maps it to a
 * `RunPiiMasksUpdate` so the client can resolve `{{pii:…}}` tokens, matching
 * the legacy loop's mask-before-message ordering.
 */
export const THREAD_PII_MASKS_EVENT = 'thread_pii_masks';
