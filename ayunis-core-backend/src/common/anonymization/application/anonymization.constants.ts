export const MAX_ANONYMIZATION_TEXT_LENGTH = 30_000;

// The anonymizer processes about 3 ms per character at p90, so a single
// request can only finish about 15k characters inside the 60 s timeout.
// Longer texts go to the service as overlapping chunks of this size, in
// parallel, and the service spreads them over its workers (AYC-1254).
// Must stay below MAX_TEXT_LENGTH in ayunis-core-anonymize/app/models.py.
export const ANONYMIZATION_CHUNK_LENGTH = 5_000;
// An entity shorter than the overlap is always seen whole by one chunk; a
// longer one is masked from the union of what both chunks saw.
export const ANONYMIZATION_CHUNK_OVERLAP = 500;
// In-flight chunk requests per detection. The service runs a handful of
// analyses at a time for everyone, so one long text must not occupy every
// worker and leave other users' short messages queued behind it.
export const ANONYMIZATION_CHUNK_CONCURRENCY = 3;
