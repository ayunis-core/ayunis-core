import type { INestApplication, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import { featuresConfig } from 'src/config/features.config';
import { SuperAdminSubscriptionsController } from 'src/iam/subscriptions/presenters/http/super-admin-subscriptions.controller';
import { SuperAdminSubscriptionOverlapController } from 'src/iam/subscriptions/presenters/http/super-admin-subscription-overlap.controller';
import { SuperAdminAddonsController } from 'src/iam/addons/presenters/http/super-admin-addons.controller';
import { SuperAdminTrialsController } from 'src/iam/trials/presenters/http/super-admin-trials.controller';
import { SystemRolesGuard } from 'src/iam/authorization/application/guards/system-roles.guard';
import { APP_GUARD } from '@nestjs/core';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';

const ORG = '11111111-1111-4111-8111-111111111111';
const subscriptionPath = `/super-admin/subscriptions/${ORG}`;
const addonPath = `/super-admin/addons/${ORG}/ayunis_core_academy`;
const mutations = [
  ['POST', subscriptionPath],
  ['POST', `${subscriptionPath}/change`],
  ['PUT', `${subscriptionPath}/seats`],
  ['PUT', `${subscriptionPath}/monthly-credits`],
  ['PUT', `${subscriptionPath}/billing-info`],
  ['PUT', `${subscriptionPath}/start-date`],
  ['DELETE', subscriptionPath],
  ['POST', `${subscriptionPath}/uncancel`],
  ['POST', `${subscriptionPath}/resolve-overlap`],
  ['POST', addonPath],
  ['DELETE', addonPath],
];
const controllers = [
  SuperAdminSubscriptionsController,
  SuperAdminSubscriptionOverlapController,
  SuperAdminAddonsController,
  SuperAdminTrialsController,
];

function dependencyStubs() {
  const tokens = controllers.flatMap(
    (controller) =>
      Reflect.getMetadata('design:paramtypes', controller) as Type<unknown>[],
  );
  return [...new Set(tokens)].map((provide) => ({
    provide,
    useValue: {
      execute: jest.fn().mockResolvedValue([]),
      toDto: () => ({}),
    },
  }));
}

describe.each([
  ['cloud', 'true', true],
  ['cloud', 'false', false],
  ['self-hosted', 'true', false],
])(
  'manual subscription HTTP policy: environment=%s, flag=%s',
  (environment, flag, blocked) => {
    let app: INestApplication;
    let baseUrl: string;

    beforeAll(async () => {
      const original = process.env;
      process.env = {
        ...original,
        APP_ENVIRONMENT: environment,
        FEATURE_EXTERNAL_SUBSCRIPTIONS_ENABLED: flag,
      };
      try {
        const module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              ignoreEnvFile: true,
              load: [
                featuresConfig,
                () => ({ app: { isCloudHosted: environment === 'cloud' } }),
              ],
            }),
          ],
          controllers,
          providers: [
            ...dependencyStubs(),
            { provide: APP_GUARD, useClass: SystemRolesGuard },
          ],
        }).compile();
        app = module.createNestApplication({ logger: false });
        app.use((req: Request, _res: unknown, next: () => void) => {
          req.user = {
            id: ORG,
            orgId: ORG,
            systemRole: req.headers['x-test-role'] ?? SystemRole.SUPER_ADMIN,
          };
          next();
        });
        await app.listen(0, '127.0.0.1');
        baseUrl = await app.getUrl();
      } finally {
        process.env = original;
      }
    });

    afterAll(async () => {
      await app?.close();
    });

    it.each(mutations)('enforces %s %s', async (method, path) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          adjustments: [],
          startsAt: new Date().toISOString(),
        }),
      });
      if (blocked) expect(response.status).toBe(403);
      else expect(response.status).toBeLessThan(300);
    });

    it('keeps subscription reads and trial creation available', async () => {
      expect((await fetch(`${baseUrl}${subscriptionPath}`)).status).toBe(200);
      expect((await fetch(`${baseUrl}/super-admin/addons/${ORG}`)).status).toBe(
        200,
      );
      expect(
        (
          await fetch(`${baseUrl}/super-admin/trials`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ orgId: ORG, maxMessages: 100 }),
          })
        ).status,
      ).toBe(201);
    });

    it('does not weaken the super-admin role boundary', async () => {
      expect(
        (
          await fetch(`${baseUrl}${subscriptionPath}`, {
            headers: { 'x-test-role': SystemRole.CUSTOMER },
          })
        ).status,
      ).toBe(403);
    });
  },
);
