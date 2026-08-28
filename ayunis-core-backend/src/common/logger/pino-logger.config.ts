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
  'error',
  'err',
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

const REDACT_PATHS = REDACTED_KEYS.flatMap((key) => [
  key,
  `*.${key}`,
  `*.*.${key}`,
]);

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
        censor: '[Redacted]',
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
