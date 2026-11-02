# Provider HTTP2 diagnostics (AYC-1522)

`Http2TransportDiagnostics` subscribes to Node's HTTP2 diagnostic channels from
`LoggingModule`. It observes streams; it does not replace fetch, configure an
agent, retry requests, suppress incidents, or add stream error/data listeners.

## Scope and privacy

A failure record is emitted only for a known provider hostname or an endpoint
configured under `models`, `retrieval.mistral.serverUrl`, or
`embeddings.mistral.serverUrl`. The scope includes
Mistral, Anthropic, OpenAI, Gemini, regional Bedrock runtime hosts, and configured
Azure/Ollama/Ayunis/Synaforce/OTC/Stackit/Scaleway hosts. A hostname shared by
multiple configured providers is labeled `shared` rather than attributed to one.
The allowlist is resolved during module initialization; endpoint changes require
the normal application restart.

Successful streams and ordinary HTTP2 cancellation (reset code 8 without another
HTTP2 error) emit no failure record. One initialization record reports the
runtime versions so deployment activation can be checked without inducing errors.

Records contain a hostname and a fixed operation category, never raw URLs,
paths, queries, credentials, headers, bodies, error messages, or stacks. GOAWAY
debug data is represented by its length; only exact, fixed reason tokens such as
`too_many_pings` are permitted. Arbitrary debug text is excluded.

## Reading a failure

Search the named environment's AppSignal application logs for:

```text
message:"Provider HTTP2 stream failed"
```

Useful fields:

- `upstreamHost`, `provider`, `operation`: failing transport destination and
  host-derived provider hint; operations include inference, OCR, transcription,
  embedding, and other provider requests.
- `trace_id`, `span_id`: captured when that stream was created. Correlate the
  trace with existing model-call failure/usage logs and the run's terminal
  outcome or the document worker's completion/failure. These fields do not add
  an exact model-call ID or retry relationship to the transport itself.
- `resetCode`, `resetName`, `transportErrorCode`: numeric HTTP2 reset and fixed
  Node error code. AppSignal groups different reset subcodes under the same
  `ERR_HTTP2_STREAM_ERROR` incident, so inspect the subcode before suppressing
  anything.
- `phase`, `upstreamStatus`, `responseBodyRead`: whether headers arrived and
  whether Node's readable stream was consumed. **Body read is not proof of
  user-visible output.** Use application model-call and run outcome logs for that.
- `sessionId`, `streamId`, `sessionStreamCount`, `activeStreams`: correlate
  concurrent/reused sessions within the backend process. Counts cover observed
  provider streams, and `activeStreams` is captured before the failing stream
  is removed.
- `sessionObservedMs`: time since the first observed provider stream, not the
  socket's physical age. `peerMaxConcurrentStreams` is the latest observed
  remote setting, when available.
- `goawayCode`, `goawayLastStreamId`, `goawayReason`, `goawayDebugBytes`: facts
  from a received peer GOAWAY. The diagnostic channels do not identify the
  initiator of an individual stream reset; do not infer it from `resetCode`.
- `nodeVersion`, `bundledUndiciVersion`, `installedUndiciVersion`: actual local
  runtime/package versions. Both Undici versions are reported separately;
  their presence does not prove which fetch implementation created the stream.

HTTP1.1 failures, SDK errors without an HTTP2 stream, and unlisted origins are
outside this observer. Missing records do not prove those requests succeeded.

## Deployment verification

1. After deploying the containing revision to **staging**, find the
   `Provider HTTP2 diagnostics initialized` record and verify runtime versions.
2. Exercise synthetic inference and document processing; inspect normal outcomes
   and confirm that successful traffic does not emit failure records.
3. After production deployment, correlate the next natural failure with the
   existing terminal outcome logs. Do not induce provider overload to generate it.
4. Use the captured destination, reset, and session facts to choose a controlled
   reproduction and compare any HTTP1.1 or client-version mitigation.

Local regression tests use a disposable localhost HTTP2 server to reproduce a
CALM reset on a reused connection, an abrupt reset after partial response data,
and GOAWAY across concurrent streams. They assert the original errors/output and
request counts, privacy, correlation, and cleanup. These tests do not establish
that the production cause has been fixed or that deployed telemetry is ingested.

## State and scale

Stream and session lookup tables use weak keys. The strong session set is used
only to remove this observer's listeners at shutdown and releases sessions on
close. There are no timers, retained payloads, database queries, provider calls,
or cross-instance coordination. Session identifiers and counters are per process
by design; use the AppSignal hostname and trace for cross-process correlation.

Sources: [Node diagnostic channels](https://nodejs.org/api/diagnostics_channel.html#http2)
and [HTTP2 API](https://nodejs.org/api/http2.html).
