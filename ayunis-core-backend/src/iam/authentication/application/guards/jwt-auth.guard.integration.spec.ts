import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  type INestApplication,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { Strategy } from 'passport-jwt';
import { DataSource } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import 'src/config/env';
import { Public } from 'src/common/guards/public.guard';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { RefreshTokenSingleFlightService } from 'src/iam/authentication/application/services/refresh-token-single-flight.service';
import { RefreshTokenCommand } from 'src/iam/authentication/application/use-cases/refresh-token/refresh-token.command';
import { RefreshTokenUseCase } from 'src/iam/authentication/application/use-cases/refresh-token/refresh-token.use-case';
import { AuthTokens } from 'src/iam/authentication/domain/auth-tokens.entity';
import { JwtAuthGuard } from './jwt-auth.guard';

const JWT_SECRET = 'single-flight-integration-secret';
const ROTATED_REFRESH_TOKEN = 'rotated-refresh-token';

class CookieJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      secretOrKey: JWT_SECRET,
      jwtFromRequest: (request: Request) =>
        (request.cookies.access_token as string | undefined) ?? null,
    });
  }

  validate(payload: Record<string, unknown>): Record<string, unknown> {
    return payload;
  }
}

@Controller('single-flight')
class SingleFlightController {
  constructor(
    private readonly refreshTokens: RefreshTokenSingleFlightService,
  ) {}

  @Get('guarded')
  read(): string {
    return 'authenticated';
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Req() request: Request): Promise<AuthTokens> {
    return this.refreshTokens.execute(
      new RefreshTokenCommand(request.cookies.refresh_token as string),
    );
  }
}

describe('JwtAuthGuard refresh single-flight over HTTP', () => {
  let app: INestApplication;
  let baseUrl: string;
  let dataSource: DataSource;
  let schemaName: string;
  let executeRefresh: jest.Mock<Promise<AuthTokens>, []>;
  let activeTransactions = 0;
  let maxActiveTransactions = 0;

  beforeAll(async () => {
    schemaName = `ayc_1858_${randomUUID().replaceAll('-', '')}`;
    dataSource = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema: schemaName,
      entities: [],
      migrations: [],
      migrationsRun: false,
      poolSize: 2,
      extra: { connectionTimeoutMillis: 1_000 },
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.createSchema(schemaName, true);
    await queryRunner.query(
      `CREATE TABLE "${schemaName}"."refresh_invocations" ("id" uuid PRIMARY KEY)`,
    );
    await queryRunner.release();

    const renewedAccessToken = new JwtService({ secret: JWT_SECRET }).sign({
      sub: 'test-user',
    });
    executeRefresh = jest.fn(() =>
      dataSource.transaction(async (manager) => {
        activeTransactions += 1;
        maxActiveTransactions = Math.max(
          maxActiveTransactions,
          activeTransactions,
        );
        try {
          await manager.query(
            `INSERT INTO "${schemaName}"."refresh_invocations" ("id") VALUES ($1)`,
            [randomUUID()],
          );
          await new Promise((resolve) => setTimeout(resolve, 50));
          return new AuthTokens(renewedAccessToken, ROTATED_REFRESH_TOKEN);
        } finally {
          activeTransactions -= 1;
        }
      }),
    );

    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true })],
      controllers: [SingleFlightController],
      providers: [
        CookieJwtStrategy,
        JwtAuthGuard,
        RefreshTokenSingleFlightService,
        {
          provide: RefreshTokenUseCase,
          useValue: { execute: executeRefresh },
        },
        { provide: APP_GUARD, useExisting: JwtAuthGuard },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.use(parseCookies);
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  }, 30_000);

  afterAll(async () => {
    await app?.close();
    if (!dataSource?.isInitialized) return;
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.dropSchema(schemaName, true, true);
    await queryRunner.release();
    await dataSource.destroy();
  }, 30_000);

  it('shares one refresh invocation across guarded and public HTTP requests', async () => {
    const expiredAccessToken = new JwtService({ secret: JWT_SECRET }).sign(
      { sub: 'test-user' },
      { expiresIn: -1 },
    );
    const cookie = [
      `access_token=${expiredAccessToken}`,
      'refresh_token=shared-refresh-token',
    ].join('; ');

    const responses = await Promise.all([
      fetch(`${baseUrl}/single-flight/guarded`, { headers: { cookie } }),
      fetch(`${baseUrl}/single-flight/guarded`, { headers: { cookie } }),
      fetch(`${baseUrl}/single-flight/refresh`, {
        method: 'POST',
        headers: { cookie },
      }),
      fetch(`${baseUrl}/single-flight/refresh`, {
        method: 'POST',
        headers: { cookie },
      }),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([200, 200, 200, 200]);
    expect(executeRefresh).toHaveBeenCalledTimes(1);
    expect(maxActiveTransactions).toBe(1);
    const [{ count }] = await dataSource.query<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS "count" FROM "${schemaName}"."refresh_invocations"`,
    );
    expect(count).toBe(1);
    for (const response of responses.slice(0, 2)) {
      expect(response.headers.getSetCookie()).toEqual(
        expect.arrayContaining([
          expect.stringContaining(`refresh_token=${ROTATED_REFRESH_TOKEN};`),
        ]),
      );
    }
  });
});

function parseCookies(
  request: Request,
  _response: Response,
  next: NextFunction,
): void {
  request.cookies = Object.fromEntries(
    (request.headers.cookie ?? '').split('; ').map((cookie) => {
      const separator = cookie.indexOf('=');
      return [cookie.slice(0, separator), cookie.slice(separator + 1)];
    }),
  );
  next();
}
