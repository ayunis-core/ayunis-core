import type { Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { OrgErrorCode } from 'src/iam/orgs/application/orgs.errors';
import { SuperAdminOrgLifecycleController } from './super-admin-org-lifecycle.controller';
import { SuperAdminOrgsController } from './super-admin-orgs.controller';

describe('Super-admin organisation error contract', () => {
  it('exports organisation codes and associates them with lifecycle and rename errors', async () => {
    const controllers = [
      SuperAdminOrgLifecycleController,
      SuperAdminOrgsController,
    ];
    const dependencies = controllers.flatMap(
      (controller) =>
        Reflect.getMetadata('design:paramtypes', controller) as Type<unknown>[],
    );
    const module = await Test.createTestingModule({
      controllers,
      providers: [...new Set(dependencies)].map((provide) => ({
        provide,
        useValue: {},
      })),
    }).compile();
    const app = module.createNestApplication();
    try {
      await app.init();
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().build(),
      );
      expect(document.components?.schemas?.OrgErrorCode).toMatchObject({
        type: 'string',
        enum: Object.values(OrgErrorCode),
      });
      for (const [path, method, statuses] of [
        ['/super-admin/orgs/{id}/archive', 'patch', ['404', '500']],
        ['/super-admin/orgs/{id}', 'delete', ['404', '409', '500']],
        ['/super-admin/orgs/{id}', 'patch', ['404', '500']],
      ] as const) {
        for (const status of statuses) {
          expect(document.paths[path][method]?.responses[status]).toMatchObject(
            {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/OrgErrorResponseDto' },
                },
              },
            },
          );
        }
      }
    } finally {
      await app.close();
    }
  });
});
