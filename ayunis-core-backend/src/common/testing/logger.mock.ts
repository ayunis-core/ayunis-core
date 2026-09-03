import { Logger } from '@nestjs/common';

const LEVELS = ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'] as const;

export type LoggerMock = Logger &
  Record<(typeof LEVELS)[number], jest.SpyInstance>;

/**
 * Providers own their `new Logger(Context)` instance rather than receiving one
 * through DI, so the spies live on the prototype and observe every instance.
 * The returned value is still a real `Logger`, so it can also be handed to
 * helpers that take one as an argument.
 *
 * Spies are reset on each call so a test never observes an earlier test's
 * entries.
 */
export function createLoggerMock(): LoggerMock {
  for (const level of LEVELS) {
    const spy = jest.spyOn(Logger.prototype, level);
    spy.mockReset();
    spy.mockImplementation(() => undefined);
  }

  return new Logger('LoggerMock') as LoggerMock;
}
