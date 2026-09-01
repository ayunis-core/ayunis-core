/**
 * Name of the custom `RunEvent` the anonymization hook emits to stream the
 * thread's PII mask dictionary. The run-event → stream adapter maps it to a
 * `RunPiiMasksUpdate` before any message that contains `{{pii:…}}` tokens.
 */
export const THREAD_PII_MASKS_EVENT = 'thread_pii_masks';
