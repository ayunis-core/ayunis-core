import type { ExecutionContext } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { AcademyCertificateGuard } from './academy-certificate.guard';
import type { EvaluateAcademyAccessUseCase } from '../use-cases/evaluate-academy-access/evaluate-academy-access.use-case';
import type { AcademyAccessEvaluation } from '../use-cases/evaluate-academy-access/evaluate-academy-access.use-case';
import { AcademyAccessMode } from '../../domain/value-objects/academy-access-mode.enum';
import { AcademyCertificateRequiredError } from '../academy-access.errors';
import { REQUIRE_ACADEMY_CERTIFICATE_KEY } from '../decorators/academy-certificate.decorator';

interface ContextOverrides {
  gated?: boolean;
  method?: string;
  user?: { id?: UUID; orgId?: UUID } | { apiKeyId: UUID; orgId: UUID };
}

function createContext(overrides: ContextOverrides): {
  context: ExecutionContext;
  reflector: Reflector;
} {
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockImplementation((key: unknown) =>
      key === REQUIRE_ACADEMY_CERTIFICATE_KEY ? overrides.gated : undefined,
    );

  const request = {
    method: overrides.method ?? 'POST',
    url: '/runs/send-message',
    headers: {},
    socket: {},
    user: overrides.user,
  };

  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;

  return { context, reflector };
}

describe('AcademyCertificateGuard', () => {
  const orgId = randomUUID();
  const userId = randomUUID();
  const apiKeyId = randomUUID();

  let evaluateAcademyAccessUseCase: jest.Mocked<EvaluateAcademyAccessUseCase>;

  const denied: AcademyAccessEvaluation = {
    mode: AcademyAccessMode.REQUIRED_ONCE,
    required: true,
    allowed: false,
    completedAt: null,
    expiresAt: null,
  };

  const allowed: AcademyAccessEvaluation = { ...denied, allowed: true };

  beforeEach(() => {
    evaluateAcademyAccessUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<EvaluateAcademyAccessUseCase>;
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.clearAllMocks());

  function guardFor(overrides: ContextOverrides) {
    const { context, reflector } = createContext(overrides);
    const guard = new AcademyCertificateGuard(
      reflector,
      evaluateAcademyAccessUseCase,
    );
    return { guard, context };
  }

  it('passes through undecorated routes without evaluating', async () => {
    const { guard, context } = guardFor({ gated: undefined });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(evaluateAcademyAccessUseCase.execute).not.toHaveBeenCalled();
  });

  it.each(['GET', 'HEAD', 'OPTIONS', 'DELETE'])(
    'leaves %s open so chat history stays readable while blocked',
    async (method) => {
      const { guard, context } = guardFor({
        gated: true,
        method,
        user: { id: userId, orgId },
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(evaluateAcademyAccessUseCase.execute).not.toHaveBeenCalled();
    },
  );

  it('denies when no principal was resolved', async () => {
    const { guard, context } = guardFor({ gated: true, user: undefined });

    await expect(guard.canActivate(context)).resolves.toBe(false);
    expect(evaluateAcademyAccessUseCase.execute).not.toHaveBeenCalled();
  });

  it('skips api-key principals, which have no certificate holder', async () => {
    const { guard, context } = guardFor({
      gated: true,
      user: { apiKeyId, orgId },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(evaluateAcademyAccessUseCase.execute).not.toHaveBeenCalled();
  });

  it('allows a certified user', async () => {
    evaluateAcademyAccessUseCase.execute.mockResolvedValue(allowed);
    const { guard, context } = guardFor({
      gated: true,
      user: { id: userId, orgId },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('throws a coded error the frontend can branch on', async () => {
    evaluateAcademyAccessUseCase.execute.mockResolvedValue(denied);
    const { guard, context } = guardFor({
      gated: true,
      user: { id: userId, orgId },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      AcademyCertificateRequiredError,
    );
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      code: 'ACADEMY_CERTIFICATE_REQUIRED',
      statusCode: 403,
    });
  });
});
