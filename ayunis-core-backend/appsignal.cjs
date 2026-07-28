// AppSignal bootstrap — loaded via `node --require ./appsignal.cjs` (see the
// start scripts and the Dockerfile CMD) so OpenTelemetry auto-instrumentation
// patches http/express/pg before any application module is required.
const { config } = require('dotenv');
const { Appsignal } = require('@appsignal/nodejs');
const {
  UndiciInstrumentation,
} = require('@opentelemetry/instrumentation-undici');
const { readFileSync } = require('fs');
const { join } = require('path');
const { shouldIgnoreRequest } = require('./appsignal-hooks.cjs');

// This file runs before main.ts imports src/config/env, so load the same
// .env files here (dotenv never overwrites variables already set, so the
// later load in config/env.ts and container-injected env are unaffected).
config({ path: '.env.dev', quiet: true });
config({ path: '.env', quiet: true });

const pushApiKey = process.env.APPSIGNAL_PUSH_API_KEY;
const environment = process.env.NODE_ENV ?? 'development';
const revision = process.env.APP_REVISION ?? readPackageVersion();

function readPackageVersion() {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, 'package.json'), 'utf-8'),
    );
    return pkg.version;
  } catch {
    return undefined;
  }
}

// Never report from local development, even when a push API key is present in
// the local .env — dev noise (e.g. crons failing against stopped local
// services) pollutes the shared app and buries production signals.
if (pushApiKey && environment !== 'development') {
  new Appsignal({
    active: true,
    name: process.env.APPSIGNAL_APP_NAME ?? 'ayunis-core',
    pushApiKey,
    environment,
    ...(revision ? { revision } : {}),
    // Never send request params or session data: bodies carry credentials
    // (key filtering is exact-match and misses fields like currentPassword)
    // and end-user chat content, which must not reach a third-party
    // processor. Debugging context comes from tags and structured logs.
    sendParams: false,
    sendSessionData: false,
    // The NestJS instrumentation records EVERY exception thrown from guards
    // and handlers on its span — before ApplicationErrorFilter runs — so
    // expected 4xx errors (failed logins, expired sessions, domain
    // validation) become AppSignal incidents despite the filter's guard.
    // Disabling it makes the filter's setError() the single reporting path
    // for HTTP errors; express/http instrumentation still provides request
    // spans and route-based action names.
    disableDefaultInstrumentations: [
      '@opentelemetry/instrumentation-nestjs-core',
      // Replaced by the configured instance below.
      '@opentelemetry/instrumentation-undici',
    ],
    // The undici instrumentation records raw socket errors (ENOTFOUND,
    // EAI_AGAIN, connect/body timeouts, aborts) on outbound-request spans
    // even when application code catches and handles them. Crawler fetches
    // target arbitrary user-supplied URLs whose failures are expected and
    // already surface as domain errors, and the MCP listening stream is
    // aborted by design on every close — neither is instrumented (see
    // appsignal-hooks.cjs). Requests to model/OCR providers and MCP
    // JSON-RPC calls stay fully instrumented — genuine inference and
    // connectivity errors must keep reporting.
    additionalInstrumentations: [
      new UndiciInstrumentation({
        // AppSignal's default for its own undici instrumentation — without
        // it, fire-and-forget fetches outside any request context create
        // orphan root spans.
        requireParentforSpans: true,
        ignoreRequestHook: shouldIgnoreRequest,
      }),
    ],
    // Queue consumers rename job failures that BullMQ will retry to this
    // error (see bullmq-job.helpers.ts), so only final failures — thrown
    // with their original name — become incidents.
    //
    // PayloadTooLargeError is thrown by body-parser before routing, so the
    // express instrumentation records it on the middleware span and neither
    // ApplicationErrorFilter's 4xx guard nor any Nest filter can suppress it.
    // A client sending an oversized body is a 413, not an app defect
    // (AYC-553).
    ignoreErrors: ['JobRetryScheduledError', 'PayloadTooLargeError'],
  });

  console.warn(`✅ AppSignal initialized for environment: ${environment}`);
} else if (pushApiKey) {
  console.warn(
    '⚠️  AppSignal disabled in development - APPSIGNAL_PUSH_API_KEY ignored',
  );
} else {
  console.warn(
    '⚠️  APPSIGNAL_PUSH_API_KEY not configured - error tracking disabled',
  );
}
