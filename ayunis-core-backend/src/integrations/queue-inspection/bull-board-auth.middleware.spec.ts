import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { BullBoardAuthMiddleware } from './bull-board-auth.middleware';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { IpAllowlistGuard } from 'src/iam/ip-allowlist/application/guards/ip-allowlist.guard';
import { IpNotAllowedError } from 'src/iam/ip-allowlist/application/ip-allowlist.errors';

const JWT_SECRET = 'queue-inspection-test-secret';

function createResponse(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  } as unknown as Response;
}

function createRequest(token?: string, cookieName = 'access_token'): Request {
  return {
    headers: {},
    cookies: token ? { [cookieName]: token } : {},
    method: 'GET',
    url: '/api/internal/queues',
    socket: {},
  } as unknown as Request;
}

function signToken(
  jwtService: JwtService,
  systemRole: SystemRole,
  extraClaims: Record<string, unknown> = {},
): string {
  return jwtService.sign({
    sub: '11111111-2222-3333-4444-555555555555',
    email: 'operator@example.gov',
    emailVerified: true,
    orgId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    role: UserRole.ADMIN,
    systemRole,
    name: 'Queue Operator',
    ...extraClaims,
  });
}

describe('BullBoardAuthMiddleware', () => {
  const jwtService = new JwtService({ secret: JWT_SECRET });
  const ipAllowlistGuard = {
    canActivateRequest: jest.fn().mockResolvedValue(true),
  } as unknown as IpAllowlistGuard;
  const configService = new ConfigService();
  const middleware = new BullBoardAuthMiddleware(
    jwtService,
    ipAllowlistGuard,
    configService,
  );
  let response: Response;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    response = createResponse();
    next = jest.fn();
  });

  it('rejects a request without an authenticated session', async () => {
    await middleware.use(createRequest(), response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a request before cookie parsing has populated the request', async () => {
    const request = createRequest();
    Object.defineProperty(request, 'cookies', { value: undefined });
    request.headers.cookie = `access_token=${signToken(
      jwtService,
      SystemRole.SUPER_ADMIN,
    )}`;

    await middleware.use(request, response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a customer session that lacks operator authorization', async () => {
    const token = signToken(jwtService, SystemRole.CUSTOMER);

    await middleware.use(createRequest(token), response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a super admin session to inspect queues', async () => {
    const token = signToken(jwtService, SystemRole.SUPER_ADMIN);

    await middleware.use(createRequest(token), response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(ipAllowlistGuard.canActivateRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        email: 'operator@example.gov',
        systemRole: SystemRole.SUPER_ADMIN,
      }),
    );
    expect(response.status).not.toHaveBeenCalled();
  });

  it('reads the access token from the configured cookie name', async () => {
    const customConfigService = new ConfigService({
      auth: { cookie: { accessTokenName: 'operator_session' } },
    });
    const configuredMiddleware = new BullBoardAuthMiddleware(
      jwtService,
      ipAllowlistGuard,
      customConfigService,
    );
    const token = signToken(jwtService, SystemRole.SUPER_ADMIN);

    await configuredMiddleware.use(
      createRequest(token, 'operator_session'),
      response,
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
  });

  it('rejects a super admin session with an unverified email', async () => {
    const token = signToken(jwtService, SystemRole.SUPER_ADMIN, {
      emailVerified: false,
    });

    await middleware.use(createRequest(token), response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(ipAllowlistGuard.canActivateRequest).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a super admin session outside the organization IP allowlist', async () => {
    jest
      .mocked(ipAllowlistGuard.canActivateRequest)
      .mockResolvedValueOnce(false);
    const token = signToken(jwtService, SystemRole.SUPER_ADMIN);

    await middleware.use(createRequest(token), response, next);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('handles an IP allowlist denial without propagating it as a server error', async () => {
    jest
      .mocked(ipAllowlistGuard.canActivateRequest)
      .mockRejectedValueOnce(new IpNotAllowedError());
    const token = signToken(jwtService, SystemRole.SUPER_ADMIN);

    await expect(
      middleware.use(createRequest(token), response, next),
    ).resolves.toBeUndefined();

    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a special-purpose token even when it claims the super admin role', async () => {
    const token = signToken(jwtService, SystemRole.SUPER_ADMIN, {
      type: 'mfa_pending',
    });

    await middleware.use(createRequest(token), response, next);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
