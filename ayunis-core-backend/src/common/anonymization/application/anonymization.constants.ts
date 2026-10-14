// Keep this synchronized with ayunis-core-anonymize/app/models.py.
//
// Production finishes about 3 ms per character at p90, so this is the largest
// input that fits one 60 s attempt. Inputs above it timed out on both attempts
// and blocked the user's message for two minutes (AYC-1254).
export const MAX_ANONYMIZATION_TEXT_LENGTH = 15_000;
