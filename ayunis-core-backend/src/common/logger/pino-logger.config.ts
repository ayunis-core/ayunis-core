import { trace } from '@opentelemetry/api';
import type { Params } from 'nestjs-pino';
import { ClsServiceManager } from 'nestjs-cls';
import type { MyClsStore } from 'src/common/context/services/context.service';

const REDACTED_KEYS = [
  'messages',
  'tools',
  'body',
  'prompt',
  'input',
  'system',
  'request',
  'response',
  'completionOptions',
  'email',
  'userEmail',
  'name',
  'firstName',
  'lastName',
  'displayName',
  'text',
  'content',
  'fileName',
  'url',
  'domain',
  'emailDomain',
  'emailDomains',
  'reviewedEmailDomains',
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'apiKey',
  'accessToken',
  'refreshToken',
  'resetToken',
] as const;

// Top-level `err` / `error` go through `serializeError`, which only lets a
// fixed set of fields out; pino serializers do not reach nested objects, so
// those positions stay censored.
const ERROR_KEYS = ['err', 'error'] as const;

const REDACT_PATHS = [
  ...REDACTED_KEYS.flatMap((key) => [key, `*.${key}`, `*.*.${key}`]),
  ...ERROR_KEYS.flatMap((key) => [`*.${key}`, `*.*.${key}`]),
];

const CENSOR = '[Redacted]';
const MAX_CAUSE_DEPTH = 5;
// Error text and even copied stack frames can contain request data. Derive
// summaries from recognized codes instead of attempting to sanitize that text.
const ERROR_SUMMARIES = new Map<string, string>([
  ['57014', 'Database query canceled'],
  ['42P01', 'Database table does not exist'],
  ['42703', 'Database column does not exist'],
  ['23502', 'Database not-null constraint violated'],
  ['23503', 'Database foreign-key constraint violated'],
  ['23505', 'Database unique constraint violated'],
  ['40001', 'Database serialization failure'],
  ['40P01', 'Database deadlock detected'],
  ['53300', 'Database connection limit reached'],
  ['57P01', 'Database shutting down'],
  ['ECONNREFUSED', 'Connection refused'],
  ['ECONNRESET', 'Connection reset'],
  ['ETIMEDOUT', 'Connection timed out'],
  ['ENOTFOUND', 'DNS lookup failed'],
  ['EAI_AGAIN', 'DNS lookup temporarily unavailable'],
]);

interface SerializedError {
  type: string;
  message: string;
  code?: string;
  cause?: SerializedError;
}

// pino-http wraps the `err` serializer so pino's standard one runs first; its
// output keeps the original error under `raw`, which is all we need from it.
function unwrapError(value: unknown): Error | undefined {
  if (value instanceof Error) {
    return value;
  }
  const raw = (value as { raw?: unknown } | null)?.raw;
  return raw instanceof Error ? raw : undefined;
}

// Whitelist, not a copy: provider and HTTP client errors hang request and
// response payloads off their own properties, and those must never be logged.
// Raw messages, stacks, and schema identifiers are untrusted text too.
function serializeError(value: unknown): SerializedError | string {
  const error = unwrapError(value);
  return error ? toSerializedError(error, 0) : CENSOR;
}

function toSerializedError(error: Error, depth: number): SerializedError {
  const { code, cause } = error as Error & { code?: unknown; cause?: unknown };
  const summary =
    typeof code === 'string' ? ERROR_SUMMARIES.get(code) : undefined;
  return {
    type: error.constructor.name,
    message: summary ?? CENSOR,
    ...(typeof code === 'string' && summary ? { code } : {}),
    ...(cause instanceof Error && depth < MAX_CAUSE_DEPTH
      ? { cause: toSerializedError(cause, depth + 1) }
      : {}),
  };
}

export function createPinoLoggerConfig(
  environment: NodeJS.ProcessEnv = process.env,
): Params {
  const isDevelopment = environment.NODE_ENV !== 'production';

  return {
    renameContext: 'nestjs.context',
    pinoHttp: {
      level: isDevelopment ? 'debug' : 'info',
      autoLogging: false,
      quietReqLogger: true,
      quietResLogger: true,
      redact: {
        paths: REDACT_PATHS,
        censor: CENSOR,
      },
      serializers: {
        err: serializeError,
        error: serializeError,
      },
      hooks: {
        logMethod(args, method) {
          const first = args[0] as { err?: unknown; msg?: unknown } | undefined;
          const value = unwrapError(first) ?? first?.err;
          // Pino copies err.message to msg before running serializers, even
          // for plain err objects. Preserve explicit application messages.
          if (value && args[1] === undefined && first?.msg === undefined) {
            const serialized = serializeError(value);
            args[1] =
              typeof serialized === 'string' ? serialized : serialized.message;
          }
          method.apply(this, args);
        },
      },
      mixin: buildLogContext,
      transport: buildTransport(isDevelopment, environment),
    },
  };
}

function buildTransport(
  isDevelopment: boolean,
  environment: NodeJS.ProcessEnv,
) {
  if (isDevelopment) {
    return {
      target: 'pino-pretty',
      options: { colorize: true },
    };
  }

  if (!environment.APPSIGNAL_PUSH_API_KEY) {
    return undefined;
  }

  return {
    targets: [
      {
        target: 'pino/file',
        options: { destination: 1 },
      },
      {
        target: require.resolve('@appsignal/nodejs/dist/pino_transport'),
        options: { group: 'app' },
      },
    ],
  };
}

function buildLogContext(): Record<string, string> {
  return {
    ...getTenantContext(),
    ...getTraceContext(),
  };
}

function getTenantContext(): Record<string, string> {
  const cls = ClsServiceManager.getClsService<MyClsStore>();
  if (!cls.isActive()) {
    return {};
  }

  const userId = cls.get('userId');
  const orgId = cls.get('orgId');

  return {
    ...(userId ? { 'user.id': userId } : {}),
    ...(orgId ? { 'org.id': orgId } : {}),
  };
}

function getTraceContext(): Record<string, string> {
  const spanContext = trace.getActiveSpan()?.spanContext();
  if (!spanContext) {
    return {};
  }

  return {
    trace_id: spanContext.traceId,
    span_id: spanContext.spanId,
  };
}
