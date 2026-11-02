import { SubscriptionSyncLeaseRecord } from 'src/integrations/core-connect/subscription-sync/infrastructure/persistence/schema/subscription-sync-lease.record';
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
import {
  Logger,
  type INestApplication,
  type ModuleMetadata,
} from '@nestjs/common';
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

import { SubscriptionSyncOutbox } from 'src/integrations/core-connect/subscription-sync/application/ports/subscription-sync-outbox';
import { SubscriptionSyncLinkRepository } from 'src/integrations/core-connect/subscription-sync/application/ports/subscription-sync-link.repository';
import { SubscriptionSyncRevision } from 'src/integrations/core-connect/subscription-sync/application/ports/subscription-sync-revision';
import { SubscriptionSyncEventsService } from 'src/integrations/core-connect/subscription-sync/application/services/subscription-sync-events.service';
import { ApplySubscriptionSyncStateUseCase } from 'src/integrations/core-connect/subscription-sync/application/use-cases/apply-subscription-sync-state/apply-subscription-sync-state.use-case';
import { PrepareSubscriptionSyncUseCase } from 'src/integrations/core-connect/subscription-sync/application/use-cases/prepare-subscription-sync/prepare-subscription-sync.use-case';
import { ListSubscriptionSyncLinksUseCase } from 'src/integrations/core-connect/subscription-sync/application/use-cases/list-subscription-sync-links/list-subscription-sync-links.use-case';
import { SubscriptionSyncCoordinationUseCase } from 'src/integrations/core-connect/subscription-sync/application/use-cases/subscription-sync-coordination/subscription-sync-coordination.use-case';
import { SubscriptionSyncController } from 'src/integrations/core-connect/subscription-sync/presenters/http/subscription-sync.controller';
import { PostgresSubscriptionSyncLinkRepository } from 'src/integrations/core-connect/subscription-sync/infrastructure/persistence/postgres-subscription-sync-link.repository';
import { PostgresSubscriptionSyncOutbox } from 'src/integrations/core-connect/subscription-sync/infrastructure/persistence/postgres-subscription-sync-outbox';
import { PostgresSubscriptionSyncRevision } from 'src/integrations/core-connect/subscription-sync/infrastructure/persistence/postgres-subscription-sync-revision';
import { SubscriptionSyncLinkRecord } from 'src/integrations/core-connect/subscription-sync/infrastructure/persistence/schema/subscription-sync-link.record';
import { SubscriptionSyncOutboxRecord } from 'src/integrations/core-connect/subscription-sync/infrastructure/persistence/schema/subscription-sync-outbox.record';
import { SubscriptionSyncLease } from 'src/integrations/core-connect/subscription-sync/application/ports/subscription-sync-lease';
import { PostgresSubscriptionSyncLease } from 'src/integrations/core-connect/subscription-sync/infrastructure/persistence/postgres-subscription-sync-lease';
import { ValidationPipe } from '@nestjs/common';
import { toSubscriptionSyncCommand } from 'src/integrations/core-connect/subscription-sync/presenters/http/mappers/subscription-sync-command.mapper';
import type { ApplyExternalSubscriptionDto } from 'src/integrations/core-connect/subscription-sync/presenters/http/dto/subscription-sync.dto';

describe('External subscription lifecycle with real Core records and transactions', () => {
  const schema = `external_sync_${randomUUID().replaceAll('-', '')}`;
  let db: DataSource;
  let app: INestApplication;
  let sync: ApplySubscriptionSyncStateUseCase;
  let prepare: PrepareSubscriptionSyncUseCase;
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
      entities: [join(__dirname, '../../../../../**/*.record.ts')],
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
      controllers: [SubscriptionSyncController],
      providers: [
        { provide: APP_FILTER, useClass: ApplicationErrorFilter },
        { provide: DataSource, useValue: db },
        { provide: TransactionHost, useValue: host },
        { provide: ConfigService, useValue: config },
        { provide: EventEmitter2, useValue: new EventEmitter2() },

        {
          provide: SubscriptionSyncOutbox,
          useClass: PostgresSubscriptionSyncOutbox,
        },
        {
          provide: SubscriptionSyncLinkRepository,
          useClass: PostgresSubscriptionSyncLinkRepository,
        },
        {
          provide: SubscriptionSyncRevision,
          useClass: PostgresSubscriptionSyncRevision,
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
        SubscriptionSyncEventsService,
        ApplySubscriptionSyncStateUseCase,
        DeliverBillingWebhookUseCase,
        PrepareSubscriptionSyncUseCase,
        ListSubscriptionSyncLinksUseCase,
        SubscriptionSyncCoordinationUseCase,
        {
          provide: SubscriptionSyncLease,
          useClass: PostgresSubscriptionSyncLease,
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
    sync = app.get(ApplySubscriptionSyncStateUseCase);
    prepare = app.get(PrepareSubscriptionSyncUseCase);
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
    return sync.execute(toSubscriptionSyncCommand(orgId, await command()));
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
  it('requires an independent service principal and audits only the committed HTTP result', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    try {
      const body = await command();
      for (const token of [
        '',
        'Bearer user-session-token',
        'Bearer wrong-service',
      ])
        expect((await post(body, token)).status).toBe(401);
      expect(log).not.toHaveBeenCalledWith(
        expect.anything(),
        'External subscription state committed',
      );
      const response = await post(body);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ changed: true });
      expect(await subscriptions()).toHaveLength(1);
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId,
          ownerId: state.ownerId,
          previousOwnerId: null,
          nextOwnerId: state.ownerId,
          subscriptionType: 'SEAT_BASED',
          noOfSeats: 5,
          outcome: 'applied',
        }),
        'External subscription state committed',
      );
    } finally {
      log.mockRestore();
    }
  });
  it('acquires the allocation lock once and retains it through the outer transaction', async () => {
    const allocation = jest.spyOn(app.get(SeatAllocationLock), 'acquire');
    const academy = app.get(SyncAcademyAddonUseCase);
    const execute = academy.execute.bind(academy);
    const duringAcademy = jest
      .spyOn(academy, 'execute')
      .mockImplementationOnce(async (...args) => {
        const rows: { acquired: boolean }[] = await db.query(
          'SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS acquired',
          [orgId],
        );
        expect(rows[0].acquired).toBe(false);
        return execute(...args);
      });
    try {
      await run();
      expect(duringAcademy).toHaveBeenCalledTimes(1);
      expect(allocation).toHaveBeenCalledTimes(1);
      expect(allocation).toHaveBeenCalledWith(orgId);
      const rows: { acquired: boolean }[] = await db.query(
        'SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS acquired',
        [orgId],
      );
      expect(rows[0].acquired).toBe(true);
    } finally {
      duringAcademy.mockRestore();
      allocation.mockRestore();
    }
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
      await db.getRepository(SubscriptionSyncLinkRecord).countBy({ orgId }),
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
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    const links = app.get(SubscriptionSyncLinkRepository);
    const save = jest
      .spyOn(links, 'save')
      .mockRejectedValueOnce(new Error('injected persistence failure'));
    try {
      await expect(run()).rejects.toThrow();
      expect(log).not.toHaveBeenCalledWith(
        expect.anything(),
        'External subscription state committed',
      );
    } finally {
      save.mockRestore();
      log.mockRestore();
    }
    expect(await subscriptions()).toHaveLength(0);
    expect(
      await db.getRepository(TrialRecord).findOneBy({ orgId }),
    ).toMatchObject({ maxMessages: 50, messagesSent: 2 });
    expect(await db.getRepository(OrgAddonRecord).countBy({ orgId })).toBe(0);
    expect(
      await db.getRepository(SubscriptionSyncLinkRecord).countBy({ orgId }),
    ).toBe(0);
    expect(
      await db.getRepository(SubscriptionSyncOutboxRecord).countBy({ orgId }),
    ).toBe(0);
  });
  it('persists failed delivery for retry without another access change', async () => {
    await run();
    const events = app.get(SubscriptionSyncEventsService);
    sendWebhook.mockRejectedValueOnce(new Error('receiver unavailable'));
    await events.flush();
    expect(
      await db.getRepository(SubscriptionSyncOutboxRecord).countBy({ orgId }),
    ).toBeGreaterThan(0);
    await db
      .getRepository(SubscriptionSyncOutboxRecord)
      .update({ orgId }, { availableAt: new Date(0) });
    sendWebhook.mockResolvedValue(undefined);
    await events.flush();
    expect(
      await db.getRepository(SubscriptionSyncOutboxRecord).countBy({ orgId }),
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
    const lease = app.get(SubscriptionSyncLease);
    const first = randomUUID();
    const second = randomUUID();
    expect(await lease.acquire(first)).toBe(true);
    expect(await lease.acquire(first)).toBe(true);
    expect(await lease.acquire(second)).toBe(false);
    await db
      .getRepository(SubscriptionSyncLeaseRecord)
      .update({ name: 'reconciliation' }, { expiresAt: new Date(0) });
    expect(await lease.acquire(second)).toBe(true);
    await lease.release(first);
    expect(await lease.acquire(first)).toBe(false);
    await lease.release(second);
    expect(await lease.acquire(first)).toBe(true);
    await lease.release(first);
  });
});
