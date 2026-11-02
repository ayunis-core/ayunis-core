# Provider fetch connection diagnostics (AYC-1535)

## What is known

Production AppSignal (`ayunis-core`, app `6a611f0dd841ff7c22841fb2`, source
`6a611f0ed841ff7c22841fb7`) showed Mistral embedding retries at 2026-11-02
11:55:59 and 11:56:01 UTC. Both carried `ConnectionError -> TypeError -> Error`,
but the underlying code was absent and messages were redacted. A Mistral inference
failure at 13:40:01 UTC was classified as `connection` / `stream_establishment`,
with `Unable to make request: TypeError: fetch failed` and no output produced.

These observations do not identify the underlying error or prove stale socket
reuse. The diagnostic change preserves recognized Undici cause codes in Pino's
existing bounded error chain and includes that chain in unavailable-provider
inference logs. Raw messages, stacks, socket addresses, and request payloads remain
redacted. Embedding retries already log their error through this serializer.

The checked-in Dockerfile names `node:26.12.1-alpine`. The application dependency
is Undici 7.29.0; dispatcher-based requests use that dependency's own fetch rather
than mixing its dispatcher with Node's embedded Undici.

## Local evidence and limits

On macOS, Node 26.13.0 / embedded Undici 8.12.2, eight unauthenticated GET requests
to `https://api.mistral.ai/v1/models` received HTTP 401 without a connection error.
Both global fetch and dependency fetch (Undici 7.29.0, default Agent) were tested
with idle gaps of 0, 4.5, 5.5 and 15 seconds. This small, unauthenticated sample is
not the production embedding path and does not eliminate the hypothesis.

A local HTTP server that destroyed the request socket produced an actual Node 26
fetch failure. Production Pino configuration emitted `TypeError -> SocketError`
with `code: UND_ERR_SOCKET` and fixed summary `Socket connection failed`.
This proves diagnostic serialization, not the cause of the production incident.

## Production verification still required

1. Deploy diagnostics through the normal release process. Record the deployed
   revision, container ID, Node version and `process.versions.undici`.
2. Query both `Retrying Mistral embeddings after transient error` and
   `Provider unavailable during runtime inference` in production AppSignal.
   Inspect structured `json` attributes, including `err.cause` descendants.
   Separate connection failures from rate limits and HTTP2 failures.
3. Record the actual cause codes. Compare authenticated Mistral/Azure requests
   across idle gaps using the deployed runtime and egress path before choosing a
   shared-client transport fix. Check AWS/Bedrock separately; it uses a different
   HTTP handler. Do not add replay retries to requests with uncertain consumption.
4. After a demonstrated fix is released, compare a production weekday
   06:00–13:45 UTC window against the ticket's Node 24 baseline (approximately zero
   stream-setup connection errors and 0–1 embedding connection retries per day).
   Keep AYC-1535 open until its acceptance criteria are met.

The requested read-only inspection of container `1414572f73ac` on `hetzner-05`
was blocked by SSH public-key authentication on 2026-11-02. Once access is
available, use:

```sh
ssh hetzner-05 'docker inspect --format "OOMKilled={{.State.OOMKilled}} RestartCount={{.RestartCount}} ExitCode={{.State.ExitCode}} StartedAt={{.State.StartedAt}} FinishedAt={{.State.FinishedAt}}" 1414572f73ac'
```

The container may no longer exist. An absent container is not evidence that it
was or was not OOM-killed. Do not restart or modify production infrastructure to
recover this historical evidence.
