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
const {
  shouldIgnoreRequest,
  ignoredErrorTypes,
  disabledInstrumentations,
} = require('./appsignal-hooks.cjs');

// This file runs before main.ts imports src/config/env, so load the same
// .env files here (dotenv never overwrites variables already set, so the
// later load in config/env.ts and container-injected env are unaffected).
config({ path: '.env.dev', quiet: true });
config({ path: '.env', quiet: true });

const pushApiKey = process.env.APPSIGNAL_PUSH_API_KEY;
// APPSIGNAL_APP_ENV lets staging hosts (which run with NODE_ENV=production
// for migrations/logger/CORS behavior) report into a separate AppSignal
// environment. Must be resolved here: the explicit `environment` option
// below overrides AppSignal's own APPSIGNAL_APP_ENV handling.
const environment =
  process.env.APPSIGNAL_APP_ENV ?? process.env.NODE_ENV ?? 'development';
// `||`, not `??`: images built without the APP_REVISION build arg (local
// compose) carry it as an empty string, which must fall back too.
const revision = process.env.APP_REVISION || readPackageVersion();

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
    // Every suppression below is declared in appsignal-hooks.cjs, which
    // carries the reason and the ticket for each one and is the only place
    // they may be added. Nothing here decides policy.
    disableDefaultInstrumentations: disabledInstrumentations,
    additionalInstrumentations: [
      new UndiciInstrumentation({
        // AppSignal's default for its own undici instrumentation — without
        // it, fire-and-forget fetches outside any request context create
        // orphan root spans.
        requireParentforSpans: true,
        ignoreRequestHook: shouldIgnoreRequest,
      }),
    ],
    ignoreErrors: ignoredErrorTypes,
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
