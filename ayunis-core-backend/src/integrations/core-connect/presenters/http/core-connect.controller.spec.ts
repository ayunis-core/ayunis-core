import { Controller, Get, type INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { CoreConnectModule } from 'src/integrations/core-connect/core-connect.module';
import { JwtAuthGuard } from 'src/iam/authentication/application/guards/jwt-auth.guard';
import { RefreshTokenUseCase } from 'src/iam/authentication/application/use-cases/refresh-token/refresh-token.use-case';

const TOKEN = 'a'.repeat(64);
const JWT_SECRET = 'independent-browser-session-secret';

class BrowserSessionStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      secretOrKey: JWT_SECRET,
      jwtFromRequest: (req: Request) => {
        const token = req.headers['x-test-session'];
        return typeof token === 'string' ? token : null;
      },
    });
  }

  validate(payload: Record<string, unknown>): Record<string, unknown> {
    return payload;
  }
}

@Controller('protected')
class ProtectedController {
  @Get()
  read(): string {
    return 'session-only';
  }
}

describe('Core Connect authentication over HTTP', () => {
  let app: INestApplication;
  let baseUrl: string;
  let config: ConfigService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        CoreConnectModule,
      ],
      controllers: [ProtectedController],
      providers: [
        BrowserSessionStrategy,
        { provide: RefreshTokenUseCase, useValue: { execute: jest.fn() } },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.use((req: Request, _res: unknown, next: () => void) => {
      req.cookies = {};
      next();
    });
    config = app.get(ConfigService);
    config.set('coreConnect.serviceToken', TOKEN);
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('authenticates the service without a browser session', async () => {
    const response = await fetch(`${baseUrl}/internal/core-connect/auth`, {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it('rejects unauthenticated requests and browser sessions without the service token', async () => {
    const session = new JwtService({ secret: JWT_SECRET }).sign({
      sub: 'browser-user',
    });
    expect(
      (
        await fetch(`${baseUrl}/protected`, {
          headers: { 'x-test-session': session },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await fetch(`${baseUrl}/internal/core-connect/auth`, {
          headers: { 'x-test-session': session },
        })
      ).status,
    ).toBe(401);
    expect((await fetch(`${baseUrl}/internal/core-connect/auth`)).status).toBe(
      401,
    );
  });

  it('does not grant the service access to session-protected endpoints', async () => {
    const response = await fetch(`${baseUrl}/protected`, {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(response.status).toBe(401);
  });

  it('fails closed after removing the configured token', async () => {
    config.set('coreConnect.serviceToken', undefined);
    try {
      expect(
        (
          await fetch(`${baseUrl}/internal/core-connect/auth`, {
            headers: { authorization: `Bearer ${TOKEN}` },
          })
        ).status,
      ).toBe(401);
    } finally {
      config.set('coreConnect.serviceToken', TOKEN);
    }
  });
});
