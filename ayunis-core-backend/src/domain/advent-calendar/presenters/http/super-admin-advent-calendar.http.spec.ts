import type { INestApplication, Type } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import { SystemRolesGuard } from 'src/iam/authorization/application/guards/system-roles.guard';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { aDoor } from 'src/domain/advent-calendar/application/testing/advent-calendar.fixtures';
import { AdventCalendarDtoMapper } from './mappers/advent-calendar-dto.mapper';
import { SuperAdminAdventCalendarController } from './super-admin-advent-calendar.controller';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const door = { title: 'Skills', body: '', buttons: [] };
// Every row has a body slot: Jest reads a test taking more arguments than
// the row has as one waiting for `done`.
const endpoints: [string, string, unknown][] = [
  ['GET', '/super-admin/advent-calendar', undefined],
  ['PUT', '/super-admin/advent-calendar/enabled', { enabled: true }],
  ['PUT', '/super-admin/advent-calendar/doors/5', door],
  ['PUT', '/super-admin/advent-calendar/doors/5/image', undefined],
  ['DELETE', '/super-admin/advent-calendar/doors/5/image', undefined],
  ['GET', '/super-admin/advent-calendar/doors/5/image', undefined],
  ['DELETE', '/super-admin/advent-calendar/doors/5', undefined],
];

describe('super-admin advent calendar HTTP role boundary', () => {
  let app: INestApplication;
  let baseUrl: string;
  const useCaseCalls = jest.fn();

  beforeAll(async () => {
    const tokens = (
      Reflect.getMetadata(
        'design:paramtypes',
        SuperAdminAdventCalendarController,
      ) as Type<unknown>[]
    ).filter((token) => token !== AdventCalendarDtoMapper);
    const module = await Test.createTestingModule({
      controllers: [SuperAdminAdventCalendarController],
      providers: [
        AdventCalendarDtoMapper,
        ...tokens.map((provide) => ({
          provide,
          useValue: {
            execute: useCaseCalls.mockResolvedValue({
              enabled: false,
              doors: [],
              ...aDoor(),
              stream: null,
            }),
          },
        })),
        { provide: APP_GUARD, useClass: SystemRolesGuard },
      ],
    }).compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.use((req: Request, _res: unknown, next: () => void) => {
      req.user = {
        id: USER_ID,
        orgId: USER_ID,
        systemRole: req.headers['x-test-role'],
      };
      next();
    });
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => useCaseCalls.mockClear());

  const call = (
    method: string,
    path: string,
    role: SystemRole,
    body?: unknown,
  ) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers:
        body === undefined
          ? { 'x-test-role': role }
          : { 'content-type': 'application/json', 'x-test-role': role },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  it.each(endpoints)(
    'refuses %s %s to a user who is not a super admin',
    async (method, path, body) => {
      const response = await call(method, path, SystemRole.CUSTOMER, body);

      expect(response.status).toBe(403);
      expect(useCaseCalls).not.toHaveBeenCalled();
    },
  );

  it.each(endpoints)(
    'lets a super admin through %s %s',
    async (method, path, body) => {
      const response = await call(method, path, SystemRole.SUPER_ADMIN, body);

      expect(response.status).not.toBe(403);
      expect(response.status).not.toBe(401);
    },
  );
});
