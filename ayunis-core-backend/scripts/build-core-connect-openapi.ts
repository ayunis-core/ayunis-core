import { ListSubscriptionSyncLinksUseCase } from 'src/integrations/core-connect/subscription-sync/application/use-cases/list-subscription-sync-links/list-subscription-sync-links.use-case';
import 'reflect-metadata';
import { DECORATORS } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SubscriptionSyncController } from 'src/integrations/core-connect/subscription-sync/presenters/http/subscription-sync.controller';
import { ApplySubscriptionSyncStateUseCase } from 'src/integrations/core-connect/subscription-sync/application/use-cases/apply-subscription-sync-state/apply-subscription-sync-state.use-case';
import { PrepareSubscriptionSyncUseCase } from 'src/integrations/core-connect/subscription-sync/application/use-cases/prepare-subscription-sync/prepare-subscription-sync.use-case';
import { SubscriptionSyncCoordinationUseCase } from 'src/integrations/core-connect/subscription-sync/application/use-cases/subscription-sync-coordination/subscription-sync-coordination.use-case';
import { CoreConnectAuthGuard } from 'src/integrations/core-connect/auth/core-connect-auth.guard';

export async function buildCoreConnectDocuments() {
  const controllers = [SubscriptionSyncController];
  const module = await Test.createTestingModule({
    controllers,
    providers: [
      { provide: ApplySubscriptionSyncStateUseCase, useValue: {} },
      { provide: PrepareSubscriptionSyncUseCase, useValue: {} },
      { provide: SubscriptionSyncCoordinationUseCase, useValue: {} },
      { provide: ListSubscriptionSyncLinksUseCase, useValue: {} },
      { provide: ConfigService, useValue: {} },
    ],
  })
    .overrideGuard(CoreConnectAuthGuard)
    .useValue({ canActivate: () => false })
    .compile();
  const app = module.createNestApplication();
  const publicDocument = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Public API').setVersion('1.0').build(),
  );
  const originalExclusions = controllers.map((controller) => ({
    controller,
    metadata: Reflect.getOwnMetadata(
      DECORATORS.API_EXCLUDE_CONTROLLER,
      controller,
    ) as unknown,
  }));
  try {
    // Nest's exclusion decorator appends metadata, so applying it with false
    // cannot override an existing true. Only this offline exporter removes it.
    controllers.forEach((controller) =>
      Reflect.deleteMetadata(DECORATORS.API_EXCLUDE_CONTROLLER, controller),
    );
    const internal = SwaggerModule.createDocument(
      app,
      coreConnectDocumentConfig(),
    );
    return { internal, publicDocument };
  } finally {
    for (const { controller, metadata } of originalExclusions) {
      if (metadata === undefined)
        Reflect.deleteMetadata(DECORATORS.API_EXCLUDE_CONTROLLER, controller);
      else
        Reflect.defineMetadata(
          DECORATORS.API_EXCLUDE_CONTROLLER,
          metadata,
          controller,
        );
    }
    await app.close();
  }
}

function coreConnectDocumentConfig() {
  return new DocumentBuilder()
    .setTitle('Core Connect internal API')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'opaque' },
      'core-connect',
    )
    .build();
}
