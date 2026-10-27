# Aggregate anonymization reuse study (AYC-1434)

## Data boundary

This study keeps tenant-scoped HMAC fingerprints **only in backend process memory**.
It emits no measurement logs and exports no fingerprints, tenant/user/thread IDs,
trace IDs, individual request timestamps, input lengths, document text, or detected
values. The existing Prometheus path exports cumulative global counters and gauges;
its only study label is `result="hit"` or `result="miss"`.

Existing operational logs and unrelated metrics can still contain identity fields.
This change does not audit or remove those. In particular, `/metrics` contains other
identity-labelled metrics: export only the `ayunis_anonymization_study_` families
when sharing study results. Do not export the whole endpoint as study data.

Aggregate export reduces disclosure; it does not certify compliance with a customer
policy. Confirm the measurement purpose, access, recipients and retention are covered
before enabling. Collection is disabled by default; no Redis is introduced and
repeated input still goes through the real detector.

## Activation

After merging and deploying, supply these two backend environment settings through
the normal deployment and secret-management process:

- `ANONYMIZATION_MEASUREMENT_KEY`: a new dedicated random secret of at least 32
  characters. Never reuse a JWT, Redis or other application secret.
- `ANONYMIZATION_MEASUREMENT_EXPIRES_AT`: a UTC ISO timestamp one week after
  activation, so the window covers a representative working week and the study
  switches itself off without a second deploy. Missing, invalid, short-key or
  expired settings disable the study.

The fingerprint covers the tenant, the requested entities, chunk length/overlap and
the text. It does not include the anonymizer's model or image version: a window of
one week is short enough to treat the detector as fixed. If an anonymizer image with
a changed model or recognizer set is deployed inside the window, note the date in the
report; hits across that deploy count reuse that a real cache keyed by detector
version would miss.

Ensure the deployment passes these values into the app container. They are read at
startup. Verify an anonymous document/tool flow increments the study request counter.
User messages and calls without explicit tenant context are excluded.

## Memory and lifecycle

The backend retains at most **10,000** fingerprint entries for **24 hours** from a
successful simulated miss completion. No input, detected spans or detected values
are retained in this map: each entry contains a keyed fingerprint, expiry and byte
estimate. Tenant scoping is internal and is not exported. Hits do not extend expiry.
Concurrent starts before the first successful completion are misses. Failed
analyses never populate the map; successful empty results do.

Cleanup runs every minute and on study activity. Expired entries, and all entries
at the study deadline, are cleared within that interval; shutdown also clears them.
In-flight detector calls may hold their observation until completion. At the memory
bound, new fingerprints are skipped and the capacity-drop counter increments; hits
then form a lower-bound estimate. Do not interpret a saturated study as complete
coverage. Changing the key/version starts a new comparison population.

Every backend instance has its own map and counters. Restarts reset them, which
reduces observed reuse. Report restarts and replica count. This study measures
per-instance reuse; it can underestimate a future shared cache across replicas.

## Read the aggregates

Use the existing authenticated metrics access/scraping configuration; do not expose
a new public endpoint. Retain the aggregate series or before/after snapshots for the
observation week. All metric names start with `ayunis_anonymization_study_`:

| Suffix | Meaning |
| --- | --- |
| `requests_total{result}` | Completed detections, by simulated hit/miss |
| `detection_seconds_total{result}` | Observed detector duration by hit/miss |
| `instrumentation_seconds_total` | Fingerprinting and metadata-size calculation |
| `failures_total` | Detector failures during the study |
| `capacity_drops_total` | Successful misses skipped at the memory bound |
| `admissions_total` | Newly admitted fingerprints within the TTL |
| `entries` | Current number of retained fingerprints |
| `estimated_bytes` | Estimated Redis working set for retained fingerprints |

Calculate hit rate from the increase in hit requests divided by the increase in all
requests over the same window. Potential detector time avoided is the increase in
`detection_seconds_total{result="hit"}`. Handle process-counter resets using your
metrics backend; a missing hit series means no observed hits, not missing requests.
Use sampled maxima of entries/bytes to estimate the working set; a scrape can miss
short-lived peaks. Admission counts are TTL admissions, not exact daily unique
inputs. Per-person, per-organization and individual-request analysis is intentionally
unavailable. The offline event-export/replay scripts have been removed.

The byte estimate is serialized detection metadata plus a 64-byte fingerprint and
256 assumed overhead bytes per entry, not actual Redis or Node allocator usage.
The duration includes provider queueing/retries and is not CPU time or guaranteed
end-user latency saved. Instrumentation time excludes metrics handling/transport.
Compare backend CPU/latency and study coverage during collection.

## Report and cleanup

Post the aggregate observation window, deployments, replica/restart information,
coverage/capacity drops, hit rate, potential time avoided, estimated working set and
instrumentation overhead on AYC-1430. Recommend proceed, collect more evidence, or
defer. AYC-1434 remains In Development until the report exists.

Remove the two settings and retire the dedicated secret after the study. The
expiry clears fingerprint memory, but does not delete aggregate series already
retained by monitoring; apply the approved retention there. Remove this temporary
instrumentation after the decision. Keep no per-request export because none is
needed to answer the caching question.
