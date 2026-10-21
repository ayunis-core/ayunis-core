import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ConfigService } from '@nestjs/config';
import { RateLimitGuard } from 'src/common/guards/rate-limit.guard';
import { RateLimitExceededError } from 'src/common/errors/rate-limit-exceeded.error';
import { AcademyAccessController } from './academy-access.controller';

function context(userId: string): ExecutionContext {
  return {
    getClass: () => AcademyAccessController,
    getHandler: () => AcademyAccessController.prototype.exportOrgCertificates,
    switchToHttp: () => ({
      getRequest: () => ({
        ip: '203.0.113.7',
        socket: { remoteAddress: '203.0.113.7' },
        headers: {},
        user: { id: userId, orgId: 'municipality' },
      }),
    }),
  } as unknown as ExecutionContext;
}

it('limits CSV exports to ten per administrator independently of a shared IP', () => {
  const config = { get: () => true } as unknown as ConfigService;
  const guard = new RateLimitGuard(new Reflector(), config);
  for (let index = 0; index < 10; index++) {
    expect(guard.canActivate(context('anna'))).toBe(true);
  }
  expect(() => guard.canActivate(context('anna'))).toThrow(
    RateLimitExceededError,
  );
  expect(guard.canActivate(context('bruno'))).toBe(true);
});
