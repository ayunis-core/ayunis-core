import { WinstonTransport } from '@appsignal/nodejs';
import { ClsServiceManager } from 'nestjs-cls';
import type { MyClsStore } from '../context/services/context.service';

interface LogInfo {
  level: string;
  message: string;
  context?: string;
  [key: string | symbol]: unknown;
}

/**
 * Keys whose values may carry user prompt content or raw provider SDK
 * payloads. Provider SDKs (OpenAI/Anthropic/Gemini/Bedrock) routinely echo
 * prompt fragments in error bodies and response payloads; our own internal
 * names cover messages, tools, and completion options. Values under these
 * keys are replaced with REDACTED_PLACEHOLDER before reaching AppSignal.
 */
const REDACTED_KEYS = new Set([
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
]);

const REDACTED_PLACEHOLDER = '[redacted]';

/**
 * Winston transport that forwards log entries to AppSignal Logging.
 *
 * Wraps AppSignal's own WinstonTransport so every entry is rebuilt through
 * buildAttributes() first — redaction and CLS tenant enrichment must happen
 * before delegation, because the parent transport forwards attributes to the
 * agent as-is.
 */
export class AppsignalLogTransport extends WinstonTransport {
  log(info: LogInfo, callback: () => void): void {
    const { level, message, context, ...rest } = info;
    const attrs = buildAttributes(context, rest);

    super.log(
      {
        level,
        message,
        // Winston stores the effective level under Symbol.for('level');
        // the parent transport reads it to derive severity.
        [Symbol.for('level')]: info[Symbol.for('level')] ?? level,
        ...attrs,
      },
      callback,
    );
  }
}

export function buildAttributes(
  context: string | undefined,
  rest: Record<string, unknown>,
): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};

  if (context) {
    attrs['nestjs.context'] = context;
  }

  addTenantContext(attrs);
  addRedactedMetadata(attrs, rest);

  return attrs;
}

// Attach tenant context from CLS so logs fired outside a request scope
// (background jobs, schedulers, queue workers) still carry user/org.
function addTenantContext(attrs: Record<string, unknown>): void {
  const cls = ClsServiceManager.getClsService<MyClsStore>();
  if (!cls.isActive()) {
    return;
  }

  const userId = cls.get('userId');
  const orgId = cls.get('orgId');
  if (userId) attrs['user.id'] = userId;
  if (orgId) attrs['org.id'] = orgId;
}

// Forward any structured metadata (NestJS Logger passes extra args as
// object properties on the info object). Skip internal Winston symbols.
// Redact known-unsafe keys and Error instances — both may carry prompt
// content from provider SDKs.
function addRedactedMetadata(
  attrs: Record<string, unknown>,
  rest: Record<string, unknown>,
): void {
  for (const [key, value] of Object.entries(rest)) {
    if (key.startsWith('Symbol(')) continue;
    if (REDACTED_KEYS.has(key) || value instanceof Error) {
      attrs[key] = REDACTED_PLACEHOLDER;
    } else {
      attrs[key] = value;
    }
  }
}
