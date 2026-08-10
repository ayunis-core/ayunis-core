// Suppression policy for the AppSignal OpenTelemetry setup in appsignal.cjs.
// Kept dependency-free (no dotenv, no @appsignal import) so tests can load
// this file without booting the AppSignal client.
//
// WHY THIS FILE IS A REGISTRY AND NOT A PILE OF HOOKS
//
// `setError()` is literally `span.recordException(error)`, and AppSignal's
// SpanProcessor forwards EVERY `exception` span event from EVERY span into the
// agent (@appsignal/nodejs, dist/helpers.js + dist/span_processor.js).
// Application-reported and instrumentation-reported errors travel the same
// path, so there is no "handled" bit to test and no single reporting path to
// funnel HTTP errors through — the premise PR #1127 was built on. Suppression
// is therefore always a deliberate exception, and every one of them lives in
// SUPPRESSIONS below, carrying the reason it exists and the ticket that
// justified it. The spec enforces that; see appsignal-hooks.spec.ts (AYC-563).
//
// TRIAGE ORDER WHEN A NEW INCIDENT APPEARS
//
// 1. Did a user experience degraded behaviour? Fix the code. This is the
//    answer most of the time: four of the five 2026-07-28 investigations
//    (AYC-549, 552, 553, 555, 560) turned out to be real robustness gaps, not
//    reporting noise. Suppressing them would have hidden live defects.
// 2. Is the failure intrinsic to a class of egress we do not own? Scope the
//    instrumentation with `ignoreRequestHook`. This requires a property that
//    is structurally true of the whole class, not of one observed failure.
// 3. Is the error name a deliberate protocol signal we throw ourselves? Use
//    `ignoreErrors`.
// 4. Otherwise it is signal. Tune the alert threshold; do not suppress.
//
// PROVIDER OUTAGES ARE TRIAGE STEP 4, NEVER A SUPPRESSION
//
// External provider failures (LLM / embeddings / OCR) arrive as the
// ProviderUnavailableError family (src/common/errors/provider.errors.ts) with
// name === code === PROVIDER_UNAVAILABLE_<CLASS>_<PROVIDER>, so both reporting
// paths group them identically: setError() groups by name, the BullMQ OTel
// recordException path prefers code. That yields one incident per provider and
// failure class, which is the whole point — adding them to SUPPRESSIONS would
// blind the rate/anomaly triggers that make an outage visible (AYC-538).
//
// STANDING RULE
//
// The incident list is a queryable record, not a work queue. Per-occurrence
// notifications are disabled AppSignal-side, so work comes from rate/anomaly
// triggers and from user-visible failures — not from an incident merely being
// open.

// Must match the User-Agent the URL crawler sends
// (cheerio.url-retriever.ts) — it is the key that scopes the undici
// ignore hook to crawler traffic.
const CRAWLER_USER_AGENT = 'Ayunis/1.0';

/**
 * Identifies outbound requests made by the URL crawler / website-content
 * tool. Their failures against arbitrary user-supplied hosts (dead domains,
 * unreachable intranet IPs, slow servers) are caught and surfaced as domain
 * errors by the retriever, so the undici instrumentation must not record the
 * raw socket errors as AppSignal incidents (AYC-538). Requests to model/OCR
 * providers do not carry this User-Agent and stay fully instrumented.
 */
function isCrawlerRequest(request) {
  return headerValue(request.headers, 'user-agent') === CRAWLER_USER_AGENT;
}

/**
 * Identifies the listening stream the MCP SDK's StreamableHTTPClientTransport
 * opens in the background on connect. The client adapter opens one connection
 * per operation and always closes it, and close() unconditionally aborts that
 * still-open stream — so undici reports an AbortError on a request the
 * application deliberately cancelled and never consumed, after the operation
 * already succeeded (AYC-555).
 *
 * The listening stream is the only outbound GET sending exactly
 * `text/event-stream`; MCP JSON-RPC calls are POSTs sending
 * `application/json, text/event-stream`, so genuine connectivity and auth
 * failures stay fully instrumented. That "only" holds today because MCP is the
 * sole SSE client — a second one would silently widen this predicate, which is
 * why it is registered as a stopgap rather than a permanent scoping rule.
 */
function isMcpEventStreamRequest(request) {
  return (
    request.method === 'GET' &&
    headerValue(request.headers, 'accept') === 'text/event-stream'
  );
}

/**
 * The key AppSignal's agent matches `ignoreErrors` against.
 *
 * OpenTelemetry derives it as `code` when truthy, falling back to `name`
 * (@opentelemetry/sdk-trace-base, Span.recordException). So socket failures
 * arrive as `ENOTFOUND` / `UND_ERR_CONNECT_TIMEOUT` / `ECONNABORTED` rather
 * than as a class name, and an `ignoreErrors` entry naming a class whose
 * instances carry a `.code` suppresses nothing at all — silently. The spec
 * asserts every entry below against a real instance of its error so that
 * mismatch fails the build instead of shipping.
 */
function exceptionTypeOf(error) {
  if (!error) {
    return undefined;
  }
  if (error.code) {
    return String(error.code);
  }
  return error.name;
}

/**
 * Every deliberate exception to "OpenTelemetry reports what it observes".
 *
 * Levers:
 * - `ignoreRequestHook`      — undici skips span creation, so nothing can be
 *                              recorded for the request. Scopes by egress
 *                              class (triage step 2).
 * - `ignoreErrors`           — the agent drops errors whose `exceptionType`
 *                              matches. Global across every action, so it only
 *                              suits names we throw ourselves (triage step 3).
 * - `disableInstrumentation` — the instrumentation is not loaded at all.
 *
 * `stopgapFor` marks a suppression that covers for a defect rather than
 * describing a permanent property. Those are expected to be removed when the
 * referenced ticket lands.
 */
const SUPPRESSIONS = [
  {
    id: 'crawler-egress',
    lever: 'ignoreRequestHook',
    ticket: 'AYC-538',
    reason:
      'Untrusted user-supplied URLs. Failures against arbitrary hosts are the ' +
      "crawler's expected outcome and already surface as " +
      'UrlRetrieverRetrievalError, so the raw socket errors are not ours to ' +
      'report.',
    match: isCrawlerRequest,
  },
  {
    id: 'mcp-listening-stream',
    lever: 'ignoreRequestHook',
    ticket: 'AYC-555',
    stopgapFor: 'AYC-571',
    reason:
      'The MCP SDK opens a background SSE GET on connect and close() aborts ' +
      'it, so undici records an AbortError after the operation already ' +
      'succeeded. This covers for per-operation connect/close — remove it ' +
      'once connections are reused.',
    match: isMcpEventStreamRequest,
  },
  {
    id: 'abort-signal-cancellation',
    lever: 'ignoreErrors',
    ticket: 'AYC-651',
    reason:
      'The DOMException Node mints for AbortController.abort() (name ' +
      'AbortError, numeric code 20, so exceptionType "20"). An abort is ' +
      'always a cancellation we or an SDK issued deliberately — MCP ' +
      'transport close after a completed operation, SDK request timeouts, ' +
      'stream watchdogs, client disconnects — never itself the failure. ' +
      'Real timeouts surface as classified application errors ' +
      '(MCP_CONNECTION_TIMEOUT, INFERENCE_TIMEOUT, PROVIDER_UNAVAILABLE_*), ' +
      'which stay fully reported.',
    exceptionType: '20',
  },
  // RAW TRANSPORT DUPLICATES OF THE CLASSIFIED PROVIDER TAXONOMY
  //
  // Since AYC-651/653/654/655, every path that acts on provider egress (LLM
  // inference, embeddings, OCR, MCP, anonymize) classifies these transport
  // codes into PROVIDER_UNAVAILABLE_* / MCP_CONNECTION_TIMEOUT before they
  // can fail a request. The undici/http instrumentation still records the
  // raw errno on the span underneath the handled retry — there is no
  // "handled" bit to test (see the header) — so each outage double-reports:
  // once classified, once raw (AYC-615/616/625, incidents #181 #329 #387
  // #409 #457 #511 #521 recurring on 2.22.2 after the taxonomy deploy).
  // The classified incidents stay fully reported and carry the AYC-538
  // rate/anomaly alerting; only the raw errno duplicates are dropped.
  {
    id: 'transport-headers-timeout',
    lever: 'ignoreErrors',
    ticket: 'AYC-616',
    reason:
      'Provider took too long to start responding. Classified as ' +
      'PROVIDER_UNAVAILABLE_TIMEOUT_* wherever it can fail a request; the ' +
      'raw undici span exception is a duplicate (incidents #521, #181).',
    exceptionType: 'UND_ERR_HEADERS_TIMEOUT',
  },
  {
    id: 'transport-dns-again',
    lever: 'ignoreErrors',
    ticket: 'AYC-616',
    reason:
      'Transient DNS resolution failure on outbound egress. Classified as ' +
      'PROVIDER_UNAVAILABLE_CONNECTION_* with one setup retry; the raw ' +
      'getaddrinfo span exception is a duplicate (incident #409).',
    exceptionType: 'EAI_AGAIN',
  },
  {
    id: 'transport-connection-reset',
    lever: 'ignoreErrors',
    ticket: 'AYC-616',
    reason:
      'Peer closed the socket mid-request ("socket hang up"). Classified as ' +
      'PROVIDER_UNAVAILABLE_CONNECTION_* with one setup retry; the raw span ' +
      'exception is a duplicate (incident #387).',
    exceptionType: 'ECONNRESET',
  },
  {
    id: 'transport-connection-aborted',
    lever: 'ignoreErrors',
    ticket: 'AYC-616',
    reason:
      'Legacy axios deadline shape: without clarifyTimeoutError, axios ' +
      'reports an exceeded timeout as ECONNABORTED (incident #457, ' +
      'pre-2.22.2 anonymize calls). Classified under the provider taxonomy ' +
      'wherever it can fail a request; the raw span exception is a ' +
      'duplicate.',
    exceptionType: 'ECONNABORTED',
  },
  {
    id: 'transport-timed-out',
    lever: 'ignoreErrors',
    ticket: 'AYC-616',
    reason:
      'Socket/deadline timeout errno. The anonymize client surfaces its ' +
      'deadline as ETIMEDOUT since AYC-654 (clarifyTimeoutError), grouped ' +
      'as PROVIDER_UNAVAILABLE_TIMEOUT_* by the taxonomy; the raw span ' +
      'exception is a duplicate. The latency root cause is tracked in ' +
      'AYC-662 via the classified incident.',
    exceptionType: 'ETIMEDOUT',
  },
  {
    id: 'transport-broken-pipe',
    lever: 'ignoreErrors',
    ticket: 'AYC-693',
    reason:
      'EPIPE confirms that the peer closed its end of a socket. Run SSE ' +
      'handles that disconnect through write callbacks; provider failures ' +
      'still report through their classified application errors, and genuine ' +
      'response failures report as SSE_RESPONSE_WRITE_FAILED (incident #511).',
    exceptionType: 'EPIPE',
  },
  {
    id: 'timeout-signal-cancellation',
    lever: 'ignoreErrors',
    ticket: 'AYC-625',
    reason:
      'The DOMException Node mints for AbortSignal.timeout() (name ' +
      'TimeoutError, numeric code 23, so exceptionType "23") — the timeout ' +
      'sibling of the AbortError suppression above. Recorded by undici ' +
      'instrumentation below SDK deadlines the application already handles ' +
      'and retries; real timeouts surface as classified application errors ' +
      '(PROVIDER_UNAVAILABLE_TIMEOUT_*, MCP_CONNECTION_TIMEOUT), which stay ' +
      'fully reported (incident #329).',
    exceptionType: '23',
  },
  {
    id: 'bullmq-retry-scheduled',
    lever: 'ignoreErrors',
    ticket: 'AYC-479',
    reason:
      'Queue consumers rename failures BullMQ will retry (see ' +
      'bullmq-job.helpers.ts), so only final failures — thrown with their ' +
      'original name — become incidents.',
    exceptionType: 'JobRetryScheduledError',
  },
  {
    id: 'oversized-request-body',
    lever: 'ignoreErrors',
    ticket: 'AYC-553',
    reason:
      'body-parser throws before routing, so the express instrumentation ' +
      'records it and no Nest filter ever sees it. An oversized client body ' +
      'is a 413, not a defect of ours.',
    exceptionType: 'PayloadTooLargeError',
  },
  {
    id: 'nestjs-core-instrumentation',
    lever: 'disableInstrumentation',
    ticket: 'AYC-479',
    reason:
      'Records EVERY exception thrown from guards and handlers on its span, ' +
      'so expected 4xx errors (failed logins, expired sessions, domain ' +
      'validation) become incidents. express/http still provide request spans ' +
      'and route-based action names.',
    instrumentation: '@opentelemetry/instrumentation-nestjs-core',
  },
  {
    id: 'undici-default-instance',
    lever: 'disableInstrumentation',
    ticket: 'AYC-538',
    reason:
      'Replaced by the configured instance in appsignal.cjs, which carries ' +
      'the ignoreRequestHook. Disabling a default also discards the config ' +
      'AppSignal sets for it, so requireParentforSpans is re-supplied there.',
    instrumentation: '@opentelemetry/instrumentation-undici',
  },
];

function suppressionsFor(lever) {
  return SUPPRESSIONS.filter((suppression) => suppression.lever === lever);
}

/**
 * The undici ignore hook wired in appsignal.cjs. Returning true skips span
 * creation entirely, so no exception can be recorded for the request.
 */
function shouldIgnoreRequest(request) {
  return suppressionsFor('ignoreRequestHook').some((suppression) =>
    suppression.match(request),
  );
}

const ignoredErrorTypes = suppressionsFor('ignoreErrors').map(
  (suppression) => suppression.exceptionType,
);

const disabledInstrumentations = suppressionsFor('disableInstrumentation').map(
  (suppression) => suppression.instrumentation,
);

// Undici request headers are either a raw `name: value\r\n` string (undici
// v5) or a flat [name, value, ...] array whose values may be string arrays
// (undici v6).
function headerValue(headers, name) {
  if (typeof headers === 'string') {
    for (const line of headers.split('\r\n')) {
      const separatorIndex = line.indexOf(':');
      if (
        separatorIndex !== -1 &&
        line.slice(0, separatorIndex).trim().toLowerCase() === name
      ) {
        return line.slice(separatorIndex + 1).trim();
      }
    }
    return undefined;
  }
  if (Array.isArray(headers)) {
    for (let i = 0; i + 1 < headers.length; i += 2) {
      if (String(headers[i]).toLowerCase() === name) {
        const value = headers[i + 1];
        return String(Array.isArray(value) ? value[0] : value);
      }
    }
  }
  return undefined;
}

module.exports = {
  SUPPRESSIONS,
  isCrawlerRequest,
  isMcpEventStreamRequest,
  shouldIgnoreRequest,
  exceptionTypeOf,
  ignoredErrorTypes,
  disabledInstrumentations,
  CRAWLER_USER_AGENT,
};
