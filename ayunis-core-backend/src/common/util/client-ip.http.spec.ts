import { ExpressAdapter } from '@nestjs/platform-express';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import type { Express, Request } from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { RateLimitGuard } from 'src/common/guards/rate-limit.guard';
import { IpAllowlistGuard } from 'src/iam/ip-allowlist/application/guards/ip-allowlist.guard';
import { UpdateIpAllowlistUseCase } from 'src/iam/ip-allowlist/application/use-cases/update-ip-allowlist/update-ip-allowlist.use-case';
import { IpAllowlistController } from 'src/iam/ip-allowlist/presenters/http/ip-allowlist.controller';
import type { GetIpAllowlistUseCase } from 'src/iam/ip-allowlist/application/use-cases/get-ip-allowlist/get-ip-allowlist.use-case';
import type { DeleteIpAllowlistUseCase } from 'src/iam/ip-allowlist/application/use-cases/delete-ip-allowlist/delete-ip-allowlist.use-case';
import { IpAllowlist } from 'src/iam/ip-allowlist/domain/ip-allowlist.entity';
import type { IpAllowlistRepository } from 'src/iam/ip-allowlist/application/ports/ip-allowlist.repository';
import type { ActiveUser } from 'src/iam/authentication/domain/active-user.entity';
import { buildAccessDeniedAuditContext } from './access-denied-audit.util';
import { getClientIp } from './ip.util';

const allowedIp = '203.0.113.7';
const headers = {
  'x-forwarded-for': allowedIp,
  'x-real-ip': allowedIp,
  'cf-connecting-ip': allowedIp,
};

function context(request: Request): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({ name: 'login' }),
    getClass: () => ({ name: 'AuthenticationController' }),
  } as unknown as ExecutionContext;
}

describe('client IP over HTTP', () => {
  let app: Express;
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    app = new ExpressAdapter().getInstance();
    server = createServer(app);
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it('preserves the allowlist when a spoofed IP would lock out the admin, then accepts a trusted real client', async () => {
    let saved = new IpAllowlist({
      orgId: principal.orgId,
      cidrs: ['127.0.0.1/32'],
    });
    const repository: IpAllowlistRepository = {
      findByOrgId: async () => saved,
      upsert: async (entity) => {
        saved = entity;
        return entity;
      },
      deleteByOrgId: async () => undefined,
    };
    const guard = new IpAllowlistGuard(new Reflector(), repository);
    const controller = new IpAllowlistController(
      {} as GetIpAllowlistUseCase,
      new UpdateIpAllowlistUseCase(repository, guard),
      {} as DeleteIpAllowlistUseCase,
    );
    app.put('/ip-allowlist', async (req, res) => {
      try {
        res.json(
          await controller.update(
            principal.orgId,
            { cidrs: [`${allowedIp}/32`] },
            req,
          ),
        );
      } catch {
        res.sendStatus(400);
      }
    });
    const update = () =>
      fetch(`${baseUrl}/ip-allowlist`, { method: 'PUT', headers });
    expect((await update()).status).toBe(400);
    expect(saved.cidrs).toEqual(['127.0.0.1/32']);
    app.set('trust proxy', 1);
    expect((await update()).status).toBe(200);
    expect(saved.cidrs).toEqual([`${allowedIp}/32`]);
  });

  it('cannot rotate headers to bypass the per-IP rate limit', async () => {
    const reflector = new Reflector();
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue({ limit: 1, windowMs: 60_000 });
    const guard = new RateLimitGuard(
      reflector,
      new ConfigService({ app: { isProduction: true } }),
    );
    app.get('/login', (req, res) => {
      try {
        guard.canActivate(context(req));
        res.sendStatus(200);
      } catch {
        res.sendStatus(429);
      }
    });
    expect((await fetch(`${baseUrl}/login`, { headers })).status).toBe(200);
    const rotated = Object.fromEntries(
      Object.keys(headers).map((key) => [key, '198.51.100.42']),
    );
    expect((await fetch(`${baseUrl}/login`, { headers: rotated })).status).toBe(
      429,
    );
  });

  it.each([false, ['192.0.2.0/24']])(
    'rejects allowlisted header impersonation for an untrusted peer (%p)',
    async (trust) => {
      app.set('trust proxy', trust);
      const guard = createAllowlistGuard();
      app.get('/protected', async (req, res) => {
        try {
          await guard.canActivateRequest(req, principal);
          res.sendStatus(200);
        } catch {
          res.status(403).json(buildAccessDeniedAuditContext(req, principal));
        }
      });
      const response = await fetch(`${baseUrl}/protected`, { headers });
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({
        clientIp: '127.0.0.1',
        userId: principal.id,
      });
    },
  );

  it.each([1, ['127.0.0.1/32']])(
    'admits the real allowed client after configuring proxy trust (%p)',
    async (trust) => {
      const guard = createAllowlistGuard();
      app.get('/protected', async (req, res) => {
        try {
          await guard.canActivateRequest(req, principal);
          res.json({ ip: getClientIp(req) });
        } catch {
          res.sendStatus(403);
        }
      });
      const proxyHeaders = {
        ...headers,
        'x-forwarded-for': `198.51.100.42, ${allowedIp}`,
      };
      expect(
        (await fetch(`${baseUrl}/protected`, { headers: proxyHeaders })).status,
      ).toBe(403);
      app.set('trust proxy', trust);
      const response = await fetch(`${baseUrl}/protected`, {
        headers: proxyHeaders,
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ip: allowedIp });
    },
  );
});

const principal = { id: randomUUID(), orgId: randomUUID() } as ActiveUser;

function createAllowlistGuard(): IpAllowlistGuard {
  const repository = {
    findByOrgId: jest
      .fn()
      .mockResolvedValue(
        new IpAllowlist({ orgId: principal.orgId, cidrs: [`${allowedIp}/32`] }),
      ),
  } as unknown as IpAllowlistRepository;
  return new IpAllowlistGuard(new Reflector(), repository);
}
