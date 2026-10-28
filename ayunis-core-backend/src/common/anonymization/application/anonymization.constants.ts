// Raised from 30k for customers who paste long documents in anonymous mode
// (AYC-1427). The cost is latency, not memory: a 60k text is 14 chunks, and
// the anonymizer's memory grows per in-flight chunk, not per request.
export const MAX_ANONYMIZATION_TEXT_LENGTH = 60_000;

// The anonymizer processes about 3 ms per character at p90, so a single
// request can only finish about 15k characters inside the 60 s timeout.
// Longer texts go to the service as overlapping chunks of this size, in
// parallel, and the service spreads them over its workers (AYC-1254).
// Must stay below MAX_TEXT_LENGTH in ayunis-core-anonymize/app/models.py.
export const ANONYMIZATION_CHUNK_LENGTH = 5_000;
// An entity shorter than the overlap is always seen whole by one chunk; a
// longer one is masked from the union of what both chunks saw.
export const ANONYMIZATION_CHUNK_OVERLAP = 500;
// In-flight chunk requests per detection. The service runs eight analyses at
// a time for everyone (ayunis-infra, AYC-1426), so one long text must not
// occupy every worker and leave other users' short messages queued behind it:
// a 60k text runs in three waves of five and leaves three workers free.
export const ANONYMIZATION_CHUNK_CONCURRENCY = 5;
