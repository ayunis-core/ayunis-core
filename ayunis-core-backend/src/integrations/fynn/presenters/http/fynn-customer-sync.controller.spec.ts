import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FynnCustomerSyncController } from './fynn-customer-sync.controller';
import { CoreConnectAuthGuard } from 'src/integrations/core-connect/application/guards/core-connect-auth.guard';
import { ReconcileFynnSubscriptionsUseCase } from 'src/integrations/fynn/application/use-cases/reconcile-fynn-subscriptions/reconcile-fynn-subscriptions.use-case';

describe('Internal Fynn customer sync HTTP boundary', () => {
  let app: INestApplication;
  let baseUrl: string;
  const id = '00000000-0000-4000-8000-000000000001';
  const execute = jest
    .fn()
    .mockResolvedValue({ processed: 1, changed: 0, failed: 0, skipped: 0 });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [FynnCustomerSyncController],
      providers: [
        CoreConnectAuthGuard,
        {
          provide: ConfigService,
          useValue: new ConfigService({
            coreConnect: { serviceToken: 'local-service-secret' },
            app: { isCloudHosted: true },
            features: { fynnManagedSubscriptionsEnabled: true },
          }),
        },
        { provide: ReconcileFynnSubscriptionsUseCase, useValue: { execute } },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });
  afterAll(async () => app.close());
  beforeEach(() => execute.mockClear());
  const path = `/internal/core-connect/fynn/customers/${id}/sync`;
  it('allows a service token and passes only the customer ID', async () => {
    const response = await fetch(baseUrl + path, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer local-service-secret',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ monthlyCredits: 999 }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      processed: 1,
      changed: 0,
      failed: 0,
      skipped: 0,
    });
    expect(execute).toHaveBeenCalledWith({
      customerId: id,
      deliveryId: undefined,
    });
  });
  it.each([undefined, 'wrong-token', 'user-session-token'])(
    'rejects non-service credentials (%s)',
    async (token) => {
      const response = await fetch(baseUrl + path, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      expect(response.status).toBe(401);
      expect(execute).not.toHaveBeenCalled();
    },
  );
  it('rejects invalid customer IDs before calling Fynn', async () => {
    const response = await fetch(
      baseUrl + '/internal/core-connect/fynn/customers/not-a-uuid/sync',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer local-service-secret' },
      },
    );
    expect(response.status).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });
});
