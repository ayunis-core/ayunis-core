import { ListExternalSubscriptionLinksUseCase } from '../src/integrations/external-subscriptions/application/use-cases/list-external-subscription-links/list-external-subscription-links.use-case';
import 'reflect-metadata';
import { DECORATORS } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ExternalSubscriptionsController } from '../src/integrations/external-subscriptions/presenters/http/external-subscriptions.controller';
import { ApplyExternalSubscriptionUseCase } from '../src/integrations/external-subscriptions/application/use-cases/apply-external-subscription/apply-external-subscription.use-case';
import { PrepareExternalSubscriptionUseCase } from '../src/integrations/external-subscriptions/application/use-cases/prepare-external-subscription/prepare-external-subscription.use-case';
import { ExternalSubscriptionCoordinationUseCase } from '../src/integrations/external-subscriptions/application/use-cases/external-subscription-coordination/external-subscription-coordination.use-case';
import { CoreConnectAuthGuard } from '../src/integrations/core-connect/core-connect-auth.guard';

export async function buildCoreConnectDocuments() {
  const controllers = [ExternalSubscriptionsController];
  const module = await Test.createTestingModule({
    controllers,
    providers: [
      { provide: ApplyExternalSubscriptionUseCase, useValue: {} },
      { provide: PrepareExternalSubscriptionUseCase, useValue: {} },
      { provide: ExternalSubscriptionCoordinationUseCase, useValue: {} },
      { provide: ListExternalSubscriptionLinksUseCase, useValue: {} },
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
