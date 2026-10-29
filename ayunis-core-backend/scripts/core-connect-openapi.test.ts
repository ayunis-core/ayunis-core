import { DECORATORS } from '@nestjs/swagger';
import { ExternalSubscriptionsController } from '../src/integrations/external-subscriptions/presenters/http/external-subscriptions.controller';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildCoreConnectDocuments } from './core-connect-openapi';

test('exports typed internal operations without exposing them in public Swagger', async () => {
  const { internal, publicDocument } = await buildCoreConnectDocuments();
  const subscription =
    internal.paths[
      '/internal/core-connect/subscription-sync/organizations/{orgId}/state'
    ]?.post;
  const customer =
    internal.paths[
      '/internal/core-connect/subscription-sync/organizations/{orgId}/preparations'
    ]?.post;
  assert.equal(subscription?.operationId, 'applyExternalSubscription');
  assert.equal(customer?.operationId, 'prepareExternalSubscription');
  assert.deepEqual(subscription?.security, [{ 'core-connect': [] }]);
  assert.ok(subscription?.responses['200']);
  assert.ok(subscription?.responses['409']);
  assert.equal(
    subscription?.parameters?.some(
      (parameter) =>
        'name' in parameter &&
        parameter.name === 'x-webhook-id' &&
        parameter.required === false,
    ),
    true,
  );
  assert.equal(Object.keys(publicDocument.paths).length, 0);
  assert.equal(Object.keys(publicDocument.components?.schemas ?? {}).length, 0);
});

test('observes the real public exclusion instead of forcing it in the exporter', async () => {
  const key = DECORATORS.API_EXCLUDE_CONTROLLER;
  const original: unknown = Reflect.getOwnMetadata(
    key,
    ExternalSubscriptionsController,
  );
  Reflect.deleteMetadata(key, ExternalSubscriptionsController);
  try {
    const { publicDocument } = await buildCoreConnectDocuments();
    assert.ok(
      publicDocument.paths[
        '/internal/core-connect/subscription-sync/organizations/{orgId}/state'
      ],
    );
    assert.equal(
      Reflect.getOwnMetadata(key, ExternalSubscriptionsController),
      undefined,
    );
  } finally {
    Reflect.defineMetadata(key, original, ExternalSubscriptionsController);
  }
});
