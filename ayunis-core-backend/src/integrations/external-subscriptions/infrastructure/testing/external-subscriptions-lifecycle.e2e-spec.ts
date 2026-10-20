import { ExternalSubscriptionLeaseRecord } from 'src/integrations/external-subscriptions/infrastructure/persistence/schema/external-subscription-lease.record';
import { APP_FILTER } from '@nestjs/core';
import { ApplicationErrorFilter } from 'src/common/filters/application-error.filter';
import { SubscriptionEndedListener } from 'src/iam/credit-limits/application/listeners/subscription-ended.listener';
import { RemoveOrgCreditLimitsUseCase } from 'src/iam/credit-limits/application/use-cases/remove-org-credit-limits/remove-org-credit-limits.use-case';
import { LocalCreditLimitRepository } from 'src/iam/credit-limits/infrastructure/persistence/local/local-credit-limit.repository';
import { CreditLimitMapper } from 'src/iam/credit-limits/infrastructure/persistence/local/mappers/credit-limit.mapper';
import {
  CreditLimitRecord,
  UserCreditLimitRecord,
  TeamCreditLimitRecord,
  ApiKeyCreditLimitRecord,
  DefaultUserCreditLimitRecord,
} from 'src/iam/credit-limits/infrastructure/persistence/local/schema/credit-limit.record';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SubscriptionCancelledEvent } from 'src/iam/subscriptions/application/events/subscription-cancelled.event';
import { ResendExpiredInviteUseCase } from 'src/iam/invites/application/use-cases/resend-expired-invite/resend-expired-invite.use-case';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { InviteJwtService } from 'src/iam/invites/application/services/invite-jwt.service';
import { LocalInvitesRepository } from 'src/iam/invites/infrastructure/persistence/local/local-invites.repository';
import { InviteMapper } from 'src/iam/invites/infrastructure/persistence/local/mappers/invite.mapper';
import 'src/config/env';
import { join } from 'node:path';
import { randomUUID, type UUID } from 'crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication, ModuleMetadata } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { DataSource } from 'typeorm';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import type { WithLengthColumnType } from 'typeorm/driver/types/ColumnTypes';
import { typeormConfigRaw } from 'src/config/typeorm.config';
import { ApplySubscriptionSyncUseCase } from 'src/iam/subscriptions/application/use-cases/apply-subscription-sync/apply-subscription-sync.use-case';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import { SubscriptionFactory } from 'src/iam/subscriptions/application/services/subscription-factory.service';
import { IsUsageBasedSubscriptionUseCase } from 'src/iam/subscriptions/application/use-cases/is-usage-based-subscription/is-usage-based-subscription.use-case';
import { SubscriptionRepository } from 'src/iam/subscriptions/application/ports/subscription.repository';
import { SeatAllocationLock } from 'src/iam/subscriptions/application/ports/seat-allocation-lock';
import { LocalSubscriptionsRepository } from 'src/iam/subscriptions/infrastructure/persistence/local/local-subscriptions.repository';
import { PostgresSeatAllocationLock } from 'src/iam/subscriptions/infrastructure/persistence/local/postgres-seat-allocation-lock';
import { SubscriptionMapper } from 'src/iam/subscriptions/infrastructure/persistence/local/mappers/subscription.mapper';
import { SubscriptionBillingInfoMapper } from 'src/iam/subscriptions/infrastructure/persistence/local/mappers/subscription-billing-info.mapper';
import { TrialRepository } from 'src/iam/trials/application/ports/trial.repository';
import { LocalTrialsRepository } from 'src/iam/trials/infrastructure/persistence/local/local-trials.repository';
import { TrialRecord } from 'src/iam/trials/infrastructure/persistence/local/schema/trial.record';
import { EndTrialUseCase } from 'src/iam/trials/application/use-cases/end-trial/end-trial.use-case';
import { OrgAddonRepository } from 'src/iam/addons/application/ports/org-addon.repository';
import { PostgresOrgAddonRepository } from 'src/iam/addons/infrastructure/persistence/postgres/org-addon.repository';
import { OrgAddonRecord } from 'src/iam/addons/infrastructure/persistence/postgres/schema/org-addon.record';
import { SyncAcademyAddonUseCase } from 'src/iam/addons/application/use-cases/sync-academy-addon/sync-academy-addon.use-case';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { CountUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/count-users-by-org-id/count-users-by-org-id.use-case';
import { CountPendingInvitesByOrgIdUseCase } from 'src/iam/invites/application/use-cases/count-pending-invites-by-org-id/count-pending-invites-by-org-id.use-case';
import { DeliverBillingWebhookUseCase } from 'src/integrations/webhooks/application/use-cases/deliver-billing-webhook/deliver-billing-webhook.use-case';
import { WebhookHandler } from 'src/integrations/webhooks/application/ports/webhook.handler';

import { ExternalSubscriptionOutbox } from 'src/integrations/external-subscriptions/application/ports/external-subscription-outbox';
import { ExternalSubscriptionLinkRepository } from 'src/integrations/external-subscriptions/application/ports/external-subscription-link.repository';
import { ExternalSubscriptionRevision } from 'src/integrations/external-subscriptions/application/ports/external-subscription-revision';
import { ExternalSubscriptionEventsService } from 'src/integrations/external-subscriptions/application/services/external-subscription-events.service';
import { ApplyExternalSubscriptionUseCase } from 'src/integrations/external-subscriptions/application/use-cases/apply-external-subscription/apply-external-subscription.use-case';
import { PrepareExternalSubscriptionUseCase } from 'src/integrations/external-subscriptions/application/use-cases/prepare-external-subscription/prepare-external-subscription.use-case';
import { ListExternalSubscriptionLinksUseCase } from 'src/integrations/external-subscriptions/application/use-cases/list-external-subscription-links/list-external-subscription-links.use-case';
import { ExternalSubscriptionCoordinationUseCase } from 'src/integrations/external-subscriptions/application/use-cases/external-subscription-coordination/external-subscription-coordination.use-case';
import { ExternalSubscriptionsController } from 'src/integrations/external-subscriptions/presenters/http/external-subscriptions.controller';
import { PostgresExternalSubscriptionLinkRepository } from 'src/integrations/external-subscriptions/infrastructure/persistence/postgres-external-subscription-link.repository';
import { PostgresExternalSubscriptionOutbox } from 'src/integrations/external-subscriptions/infrastructure/persistence/postgres-external-subscription-outbox';
import { PostgresExternalSubscriptionRevision } from 'src/integrations/external-subscriptions/infrastructure/persistence/postgres-external-subscription-revision';
import { ExternalSubscriptionLinkRecord } from 'src/integrations/external-subscriptions/infrastructure/persistence/schema/external-subscription-link.record';
import { ExternalSubscriptionOutboxRecord } from 'src/integrations/external-subscriptions/infrastructure/persistence/schema/external-subscription-outbox.record';
import { ExternalSubscriptionLease } from 'src/integrations/external-subscriptions/application/ports/external-subscription-lease';
import { PostgresExternalSubscriptionLease } from 'src/integrations/external-subscriptions/infrastructure/persistence/postgres-external-subscription-lease';
import { ValidationPipe } from '@nestjs/common';
import { toExternalSubscriptionCommand } from 'src/integrations/external-subscriptions/presenters/http/mappers/external-subscription-command.mapper';
import type { ApplyExternalSubscriptionDto } from 'src/integrations/external-subscriptions/presenters/http/dto/external-subscription.dto';

describe('External subscription lifecycle with real Core records and transactions', () => {
  const schema = `external_sync_${randomUUID().replaceAll('-', '')}`;
  let db: DataSource;
  let app: INestApplication;
  let sync: ApplyExternalSubscriptionUseCase;
  let prepare: PrepareExternalSubscriptionUseCase;
  let orgId: UUID;
  let config: ConfigService;
  let base: string;
  let definition: ModuleMetadata;
  let host: TransactionHost<TransactionalAdapterTypeOrm>;
  let state: Omit<ApplyExternalSubscriptionDto, 'revision'>;
  const sendWebhook = jest.fn();
  beforeAll(async () => {
    db = new DataSource({
      ...(typeormConfigRaw as PostgresConnectionOptions),
      schema,
      entities: [join(__dirname, '../../../../**/*.record.ts')],
      migrations: [],
      migrationsRun: false,
      logging: false,
    });
    db.driver.supportedDataTypes.push('vector' as WithLengthColumnType);
    db.driver.withLengthColumnTypes.push('vector' as WithLengthColumnType);
    await db.initialize();
    const runner = db.createQueryRunner();
    await runner.createSchema(schema, true);
    await runner.release();
    await db.synchronize();
    const adapter = new TransactionalAdapterTypeOrm({
      dataSourceToken: DataSource,
    });
    host = new TransactionHost<TransactionalAdapterTypeOrm>({
      ...adapter.optionsFactory(db),
      connectionName: undefined,
      enableTransactionProxy: false,
      defaultTxOptions: {},
      extraProviderTokens: [],
    });
    config = new ConfigService({
      app: { isCloudHosted: true },
      features: { externalSubscriptionsEnabled: true },
      coreConnect: { serviceToken: 'local-service-token' },
      subscriptions: { pricePerSeatYearly: 120 },
    });
    definition = {
      controllers: [ExternalSubscriptionsController],
      providers: [
        { provide: APP_FILTER, useClass: ApplicationErrorFilter },
        { provide: DataSource, useValue: db },
        { provide: TransactionHost, useValue: host },
        { provide: ConfigService, useValue: config },
        { provide: EventEmitter2, useValue: new EventEmitter2() },

        {
          provide: ExternalSubscriptionOutbox,
          useClass: PostgresExternalSubscriptionOutbox,
        },
        {
          provide: ExternalSubscriptionLinkRepository,
          useClass: PostgresExternalSubscriptionLinkRepository,
        },
        {
          provide: ExternalSubscriptionRevision,
          useClass: PostgresExternalSubscriptionRevision,
        },
        { provide: SeatAllocationLock, useClass: PostgresSeatAllocationLock },
        {
          provide: SubscriptionRepository,
          useClass: LocalSubscriptionsRepository,
        },
        { provide: TrialRepository, useClass: LocalTrialsRepository },
        { provide: OrgAddonRepository, useClass: PostgresOrgAddonRepository },
        {
          provide: CountUsersByOrgIdUseCase,
          useValue: { execute: async () => 0 },
        },
        {
          provide: CountPendingInvitesByOrgIdUseCase,
          useValue: { execute: async () => 0 },
        },
        {
          provide: FindOrgByIdUseCase,
          useValue: {
            execute: async ({ id }: { id: UUID }) =>
              db.getRepository(OrgRecord).findOneByOrFail({ id }),
          },
        },
        { provide: WebhookHandler, useValue: { sendWebhook } },
        { provide: InvitesRepository, useClass: LocalInvitesRepository },
        {
          provide: InviteJwtService,
          useValue: { generateInviteToken: () => 'local-invite-token' },
        },
        InviteMapper,
        ResendExpiredInviteUseCase,
        ...[
          CreditLimitRecord,
          UserCreditLimitRecord,
          TeamCreditLimitRecord,
          ApiKeyCreditLimitRecord,
          DefaultUserCreditLimitRecord,
        ].map((record) => ({
          provide: getRepositoryToken(record),
          useValue: db.getRepository(record),
        })),
        {
          provide: CreditLimitRepository,
          useClass: LocalCreditLimitRepository,
        },
        CreditLimitMapper,
        RemoveOrgCreditLimitsUseCase,
        SubscriptionEndedListener,
        IsUsageBasedSubscriptionUseCase,
        SubscriptionMapper,
        SubscriptionBillingInfoMapper,
        SubscriptionFactory,
        ApplySubscriptionSyncUseCase,
        AcquireSeatAllocationLockUseCase,
        EndTrialUseCase,
        SyncAcademyAddonUseCase,
        ExternalSubscriptionEventsService,
        ApplyExternalSubscriptionUseCase,
        DeliverBillingWebhookUseCase,
        PrepareExternalSubscriptionUseCase,
        ListExternalSubscriptionLinksUseCase,
        ExternalSubscriptionCoordinationUseCase,
        {
          provide: ExternalSubscriptionLease,
          useClass: PostgresExternalSubscriptionLease,
        },
      ],
    };
    const module = await Test.createTestingModule(definition).compile();
    app = module.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
    app.get(EventEmitter2).on(
      SubscriptionCancelledEvent.EVENT_NAME,
      // EventEmitter2.emitAsync awaits promises despite the void callback type.
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      (event: SubscriptionCancelledEvent) =>
        app.get(SubscriptionEndedListener).handleSubscriptionCancelled(event),
    );
    sync = app.get(ApplyExternalSubscriptionUseCase);
    prepare = app.get(PrepareExternalSubscriptionUseCase);
  }, 60_000);
  beforeEach(async () => {
    orgId = randomUUID();
    state = {
      ownerId: 'billing/customer-42',
      academyActive: true,
      revoke: false,
      subscription: {
        type: 'SEAT_BASED' as never,
        noOfSeats: 5,
        startsAt: '2025-01-01T00:00:00.000Z',
        endsAt: null,
        cancelledAt: null,
        billingInfo: {
          companyName: 'Municipality',
          street: 'Town Hall',
          houseNumber: '1',
          postalCode: '10115',
          city: 'Berlin',
          country: 'DE',
        },
      },
    };
    await db
      .getRepository(OrgRecord)
      .save({ id: orgId, name: 'External subscription lifecycle' });
    await db
      .getRepository(TrialRecord)
      .save({ id: randomUUID(), orgId, maxMessages: 50, messagesSent: 2 });
    sendWebhook.mockReset();
    config.set('features.externalSubscriptionsEnabled', true);
  });
  afterAll(async () => {
    await app?.close();
    if (!db?.isInitialized) return;
    const runner = db.createQueryRunner();
    await runner.dropSchema(schema, true, true);
    await runner.release();
    await db.destroy();
  });
  async function subscriptions(id = orgId) {
    return (await app.get(SubscriptionRepository).findByOrgId(id)).filter(
      (entry) =>
        entry.startsAt <= new Date() &&
        (!entry.endsAt || entry.endsAt > new Date()),
    );
  }
  async function command(mode: 'sync' | 'cleanup' = 'sync') {
    const prepared = await prepare.execute({ orgId, mode });
    return { ...state, revision: prepared.revision };
  }
  async function run() {
    return sync.execute(toExternalSubscriptionCommand(orgId, await command()));
  }
  async function post(body: unknown, token = 'Bearer local-service-token') {
    return fetch(
      `${base}/internal/core-connect/subscription-sync/organizations/${orgId}/state`,
      {
        method: 'POST',
        headers: { Authorization: token, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
  }
  it('requires an independent service principal at the real HTTP boundary', async () => {
    const body = await command();
    for (const token of [
      '',
      'Bearer user-session-token',
      'Bearer wrong-service',
    ])
      expect((await post(body, token)).status).toBe(401);
    expect((await post(body)).status).toBe(200);
    expect(await subscriptions()).toHaveLength(1);
  });
  it('rejects invalid and partial state without mutating access', async () => {
    const body = await command();
    expect((await post({ ...body, subscription: undefined })).status).toBe(400);
    expect(
      (
        await post({
          ...body,
          subscription: { ...body.subscription, noOfSeats: -1 },
        })
      ).status,
    ).toBe(400);
    expect(await subscriptions()).toHaveLength(0);
  });
  it('keeps replay stable, changes seat to credits and supports remove then recreate', async () => {
    await run();
    const first = (await subscriptions())[0];
    expect(await run()).toEqual({ changed: false });
    expect((await subscriptions())[0].id).toBe(first.id);
    const previous = state.subscription!;
    state.subscription = {
      ...previous,
      type: 'USAGE_BASED' as never,
      noOfSeats: undefined,
      monthlyCredits: 45000000,
    };
    await run();
    expect((await subscriptions())[0].type).toBe('USAGE_BASED');
    state.subscription = null;
    state.academyActive = false;
    state.revoke = true;
    await run();
    expect(await subscriptions()).toHaveLength(0);
    expect(
      await db.getRepository(ExternalSubscriptionLinkRecord).countBy({ orgId }),
    ).toBe(0);
    state.subscription = previous;
    state.revoke = false;
    state.academyActive = true;
    await run();
    expect(await subscriptions()).toHaveLength(1);
  });
  it('rejects stale prepared state after a newer preparation or replay commits', async () => {
    const stale = await command();
    await run();
    expect((await post(stale)).status).toBe(409);
    expect(await subscriptions()).toHaveLength(1);
  });
  it('fences cleanup observed before a successful synchronization', async () => {
    await run();
    const stale = await command('cleanup');
    await run();
    expect(
      (
        await post({
          ...stale,
          subscription: null,
          academyActive: false,
          revoke: true,
        })
      ).status,
    ).toBe(409);
    expect(await subscriptions()).toHaveLength(1);
  });
  it('cannot revoke another owner or organization', async () => {
    await run();
    state.ownerId = 'billing/different-customer';
    state.revoke = true;
    state.subscription = null;
    state.academyActive = false;
    expect(await run()).toEqual({ changed: false });
    expect(await subscriptions()).toHaveLength(1);
  });
  it('rolls subscription, trial, Academy, ownership and outbox back together', async () => {
    const links = app.get(ExternalSubscriptionLinkRepository);
    const save = jest
      .spyOn(links, 'save')
      .mockRejectedValueOnce(new Error('injected persistence failure'));
    try {
      await expect(run()).rejects.toThrow();
    } finally {
      save.mockRestore();
    }
    expect(await subscriptions()).toHaveLength(0);
    expect(
      await db.getRepository(TrialRecord).findOneBy({ orgId }),
    ).toMatchObject({ maxMessages: 50, messagesSent: 2 });
    expect(await db.getRepository(OrgAddonRecord).countBy({ orgId })).toBe(0);
    expect(
      await db.getRepository(ExternalSubscriptionLinkRecord).countBy({ orgId }),
    ).toBe(0);
    expect(
      await db
        .getRepository(ExternalSubscriptionOutboxRecord)
        .countBy({ orgId }),
    ).toBe(0);
  });
  it('persists failed delivery for retry without another access change', async () => {
    await run();
    const events = app.get(ExternalSubscriptionEventsService);
    sendWebhook.mockRejectedValueOnce(new Error('receiver unavailable'));
    await events.flush();
    expect(
      await db
        .getRepository(ExternalSubscriptionOutboxRecord)
        .countBy({ orgId }),
    ).toBeGreaterThan(0);
    await db
      .getRepository(ExternalSubscriptionOutboxRecord)
      .update({ orgId }, { availableAt: new Date(0) });
    sendWebhook.mockResolvedValue(undefined);
    await events.flush();
    expect(
      await db
        .getRepository(ExternalSubscriptionOutboxRecord)
        .countBy({ orgId }),
    ).toBe(0);
  });
  it('leaves the free trial available for future access', async () => {
    state.subscription!.startsAt = '2099-01-01T00:00:00.000Z';
    await run();
    expect(
      await db.getRepository(TrialRecord).findOneBy({ orgId }),
    ).toMatchObject({ maxMessages: 50, messagesSent: 2 });
  });
  it('blocks incoming writes on an independently booted flag-off instance', async () => {
    const disabled = await Test.createTestingModule(definition)
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          app: { isCloudHosted: true },
          features: { externalSubscriptionsEnabled: false },
          coreConnect: { serviceToken: 'local-service-token' },
        }),
      )
      .compile();
    const second = disabled.createNestApplication({ logger: false });
    await second.listen(0, '127.0.0.1');
    try {
      const response = await fetch(
        `${await second.getUrl()}/internal/core-connect/subscription-sync/organizations/${orgId}/state`,
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer local-service-token',
            'content-type': 'application/json',
          },
          body: JSON.stringify(await command()),
        },
      );
      expect(response.status).toBe(503);
      expect(await subscriptions()).toHaveLength(0);
    } finally {
      await second.close();
    }
  });
  it('fences reconciliation leases across workers and recovers after worker loss', async () => {
    const lease = app.get(ExternalSubscriptionLease);
    const first = randomUUID();
    const second = randomUUID();
    expect(await lease.acquire(first)).toBe(true);
    expect(await lease.acquire(first)).toBe(true);
    expect(await lease.acquire(second)).toBe(false);
    await db
      .getRepository(ExternalSubscriptionLeaseRecord)
      .update({ name: 'reconciliation' }, { expiresAt: new Date(0) });
    expect(await lease.acquire(second)).toBe(true);
    await lease.release(first);
    expect(await lease.acquire(first)).toBe(false);
    await lease.release(second);
    expect(await lease.acquire(first)).toBe(true);
    await lease.release(first);
  });
});
