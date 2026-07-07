import { Logger } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { ConfigService } from '@nestjs/config';
import { RateLimitGuard } from './rate-limit.guard';
import { RateLimitExceededError } from '../authorization.errors';
import type { RateLimitOptions } from '../decorators/rate-limit.decorator';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<ConfigService>;

  const clientIp = '203.0.113.7';

  function createContext(handlerName = 'create'): ExecutionContext {
    const request = { headers: { 'x-forwarded-for': clientIp } };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({ name: handlerName }),
      getClass: () => ({ name: 'InvitesController' }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    guard = new RateLimitGuard(reflector, configService);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('skips rate limiting outside production', () => {
    configService.get.mockReturnValue(false); // app.isProduction
    reflector.getAllAndOverride.mockReturnValue({
      limit: 1,
      windowMs: 60_000,
    } satisfies RateLimitOptions);

    expect(guard.canActivate(createContext())).toBe(true);
    // Well beyond the limit but still allowed because it is not production.
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows exactly "limit" requests then blocks the next within the window', () => {
    configService.get.mockReturnValue(true); // app.isProduction
    const options: RateLimitOptions = { limit: 3, windowMs: 15 * 60 * 1000 };
    reflector.getAllAndOverride.mockReturnValue(options);

    for (let i = 0; i < options.limit; i++) {
      expect(guard.canActivate(createContext())).toBe(true);
    }

    expect(() => guard.canActivate(createContext())).toThrow(
      RateLimitExceededError,
    );
  });

  it('resets the counter once the window has elapsed', () => {
    configService.get.mockReturnValue(true); // app.isProduction
    const options: RateLimitOptions = { limit: 2, windowMs: 1000 };
    reflector.getAllAndOverride.mockReturnValue(options);

    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(0);

    expect(guard.canActivate(createContext())).toBe(true);
    expect(guard.canActivate(createContext())).toBe(true);
    expect(() => guard.canActivate(createContext())).toThrow(
      RateLimitExceededError,
    );

    // Advance past the window: the counter should reset.
    nowSpy.mockReturnValue(2000);
    expect(guard.canActivate(createContext())).toBe(true);

    nowSpy.mockRestore();
  });
});
