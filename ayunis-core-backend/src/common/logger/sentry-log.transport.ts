import Transport from 'winston-transport';
import * as Sentry from '@sentry/nestjs';
import { ClsServiceManager } from 'nestjs-cls';
import type { MyClsStore } from '../context/services/context.service';

interface LogInfo {
  level: string;
  message: string;
  context?: string;
  [key: string]: unknown;
}

/**
 * Winston transport that forwards log entries to Sentry Structured Logs.
 *
 * Sentry Logs are a separate product from Sentry Issues/Errors — they give
 * you searchable, high-cardinality structured logs in the Sentry UI, linked
 * to traces automatically.
 *
 * This transport maps Winston levels to Sentry.logger levels:
 *   error  → Sentry.logger.error
 *   warn   → Sentry.logger.warn
 *   info   → Sentry.logger.info
 *   debug  → Sentry.logger.debug
 *   verbose/silly → Sentry.logger.trace
 */
export class SentryLogTransport extends Transport {
  log(info: LogInfo, callback: () => void): void {
    setImmediate(() => this.emit('logged', info));

    const { level, message, context, ...rest } = info;
    const attrs = buildAttributes(context, rest);

    const sentryLog = this.mapLevel(level);
    sentryLog(message, attrs);

    callback();
  }

  private mapLevel(
    winstonLevel: string,
  ): (msg: string, attrs: Record<string, unknown>) => void {
    switch (winstonLevel) {
      case 'error':
        return Sentry.logger.error;
      case 'warn':
        return Sentry.logger.warn;
      case 'info':
        return Sentry.logger.info;
      case 'debug':
        return Sentry.logger.debug;
      default:
        // verbose, silly, etc.
        return Sentry.logger.trace;
    }
  }
}

function buildAttributes(
  context: string | undefined,
  rest: Record<string, unknown>,
): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};

  if (context) {
    attrs['nestjs.context'] = context;
  }

  // Attach tenant context from CLS so logs fired outside a Sentry request
  // scope (background jobs, schedulers, queue workers) still carry user/org.
  const cls = ClsServiceManager.getClsService<MyClsStore>();
  if (cls?.isActive()) {
    const userId = cls.get('userId');
    const orgId = cls.get('orgId');
    if (userId) attrs['user.id'] = userId;
    if (orgId) attrs['org.id'] = orgId;
  }

  // Forward any structured metadata (NestJS Logger passes extra args as
  // object properties on the info object). Skip internal Winston symbols.
  for (const [key, value] of Object.entries(rest)) {
    if (typeof key === 'string' && !key.startsWith('Symbol(')) {
      attrs[key] = value;
    }
  }

  return attrs;
}
