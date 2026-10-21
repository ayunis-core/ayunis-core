import { FynnResourceNotFoundError } from 'src/integrations/fynn/application/fynn.errors';
import { SubscriptionCancelledListener } from 'src/iam/credit-limits/application/listeners/subscription-cancelled.listener';
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
import { featuresConfig } from 'src/config/features.config';
import { ResendExpiredInviteUseCase } from 'src/iam/invites/application/use-cases/resend-expired-invite/resend-expired-invite.use-case';
import { InvitesRepository } from 'src/iam/invites/application/ports/invites.repository';
import { InviteJwtService } from 'src/iam/invites/application/services/invite-jwt.service';
import { LocalInvitesRepository } from 'src/iam/invites/infrastructure/persistence/local/local-invites.repository';
import { InviteMapper } from 'src/iam/invites/infrastructure/persistence/local/mappers/invite.mapper';
import { InviteRecord } from 'src/iam/invites/infrastructure/persistence/local/schema/invite.record';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import type { Invite } from 'src/iam/invites/domain/invite.entity';
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
import { FynnClient } from 'src/integrations/fynn/application/ports/fynn-client';
import { FynnOutbox } from 'src/integrations/fynn/application/ports/fynn-outbox';
import { FynnOrgLinkRepository } from 'src/integrations/fynn/application/ports/fynn-org-link.repository';
import { FynnSyncRevision } from 'src/integrations/fynn/application/ports/fynn-sync-revision';
import { FynnSyncEventsService } from 'src/integrations/fynn/application/services/fynn-sync-events.service';
import { LoadFynnSnapshotService } from 'src/integrations/fynn/application/services/load-fynn-snapshot.service';
import { SyncFynnSubscriptionUseCase } from 'src/integrations/fynn/application/use-cases/sync-fynn-subscription/sync-fynn-subscription.use-case';
import { ReconcileFynnSubscriptionsUseCase } from 'src/integrations/fynn/application/use-cases/reconcile-fynn-subscriptions/reconcile-fynn-subscriptions.use-case';
import { RevokeUnlinkedFynnAccessUseCase } from 'src/integrations/fynn/application/use-cases/revoke-unlinked-fynn-access/revoke-unlinked-fynn-access.use-case';
import type { FynnSnapshot } from 'src/integrations/fynn/application/models/fynn-snapshot';
import { FynnSyncController } from 'src/integrations/fynn/presenters/http/fynn-sync.controller';
import { PostgresFynnOrgLinkRepository } from 'src/integrations/fynn/infrastructure/persistence/postgres-fynn-org-link.repository';
import { PostgresFynnOutbox } from 'src/integrations/fynn/infrastructure/persistence/postgres-fynn-outbox';
import { PostgresFynnSyncRevision } from 'src/integrations/fynn/infrastructure/persistence/postgres-fynn-sync-revision';
import { FynnOrgLinkRecord } from 'src/integrations/fynn/infrastructure/persistence/schema/fynn-org-link.record';
import { FynnOutboxRecord } from 'src/integrations/fynn/infrastructure/persistence/schema/fynn-outbox.record';
import { ApplySubscriptionSyncUseCase } from 'src/iam/subscriptions/application/use-cases/apply-subscription-sync/apply-subscription-sync.use-case';
import { AcquireSeatAllocationLockUseCase } from 'src/iam/subscriptions/application/use-cases/acquire-seat-allocation-lock/acquire-seat-allocation-lock.use-case';
import { SubscriptionFactory } from 'src/iam/subscriptions/application/services/subscription-factory.service';
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
import { readFileSync } from 'node:fs';

const fixtures = ['preview-cases.json', 'preview-transitions.json'].flatMap(
  (file) =>
    JSON.parse(
      readFileSync(
        join(__dirname, '../../application/services/fixtures', file),
        'utf8',
      ),
    ) as Array<FynnSnapshot & { case: string }>,
);

describe('Fynn subscription lifecycle with real Core records and transactions', () => {
  const schema = `fynn_lifecycle_${randomUUID().replaceAll('-', '')}`;
  let db: DataSource;
  let app: INestApplication;
  let sync: SyncFynnSubscriptionUseCase;
  let reconcile: ReconcileFynnSubscriptionsUseCase;
  let state: FynnSnapshot;
  let orgId: UUID;
  let config: ConfigService;
  let base: string;
  let available: boolean;
  let definition: ModuleMetadata;
  let host: TransactionHost<TransactionalAdapterTypeOrm>;
  let source: FynnClient;
  let subscriptionPresent: boolean;
  let customerPresent: boolean;
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
      features: { fynnManagedSubscriptionsEnabled: true },
      coreConnect: { serviceToken: 'local-service-token' },
      subscriptions: { pricePerSeatYearly: 120 },
    });
    source = {
      getSubscription: async () => {
        if (!available) throw new Error('Fynn unavailable');
        return structuredClone(state.subscription);
      },
      getCustomer: async () => {
        if (!customerPresent) throw new FynnResourceNotFoundError();
        return structuredClone(state.customer);
      },
      listCustomerLinks: async () =>
        customerPresent ? [structuredClone(state.customer)] : [],
      listSubscriptions: async () =>
        subscriptionPresent ? [structuredClone(state.subscription)] : [],
      getEntitlements: async () => structuredClone(state.entitlements),
    } satisfies FynnClient;
    definition = {
      controllers: [FynnSyncController],
      providers: [
        { provide: DataSource, useValue: db },
        { provide: TransactionHost, useValue: host },
        { provide: ConfigService, useValue: config },
        { provide: EventEmitter2, useValue: new EventEmitter2() },
        { provide: FynnClient, useValue: source },
        { provide: FynnOutbox, useClass: PostgresFynnOutbox },
        {
          provide: FynnOrgLinkRepository,
          useClass: PostgresFynnOrgLinkRepository,
        },
        { provide: FynnSyncRevision, useClass: PostgresFynnSyncRevision },
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
        SubscriptionCancelledListener,
        SubscriptionMapper,
        SubscriptionBillingInfoMapper,
        SubscriptionFactory,
        ApplySubscriptionSyncUseCase,
        AcquireSeatAllocationLockUseCase,
        EndTrialUseCase,
        SyncAcademyAddonUseCase,
        LoadFynnSnapshotService,
        FynnSyncEventsService,
        SyncFynnSubscriptionUseCase,
        RevokeUnlinkedFynnAccessUseCase,
        ReconcileFynnSubscriptionsUseCase,
        DeliverBillingWebhookUseCase,
      ],
    };
    const module = await Test.createTestingModule(definition).compile();
    app = module.createNestApplication({ logger: false });
    await app.listen(0, '127.0.0.1');
    base = await app.getUrl();
    app.get(EventEmitter2).on(
      SubscriptionCancelledEvent.EVENT_NAME,
      // EventEmitter2.emitAsync awaits promises despite the void callback type.
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      (event: SubscriptionCancelledEvent) =>
        app
          .get(SubscriptionCancelledListener)
          .handleSubscriptionCancelled(event),
    );
    sync = app.get(SyncFynnSubscriptionUseCase);
    reconcile = app.get(ReconcileFynnSubscriptionsUseCase);
  }, 60_000);
  beforeEach(async () => {
    orgId = randomUUID();
    available = true;
    subscriptionPresent = true;
    customerPresent = true;
    state = structuredClone(fixtures.find((entry) => entry.case === '19')!);
    state.customer.customFields = { 'ayunis-core-uuid': orgId };
    await db
      .getRepository(OrgRecord)
      .save({ id: orgId, name: 'Fynn lifecycle test' });
    await db
      .getRepository(TrialRecord)
      .save({ id: randomUUID(), orgId, maxMessages: 50, messagesSent: 2 });
    sendWebhook.mockReset();
    config.set('features.fynnManagedSubscriptionsEnabled', true);
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
        (!entry.accessEndsAt || entry.accessEndsAt > new Date()),
    );
  }
  async function run() {
    return sync.execute({ subscriptionId: state.subscription.id });
  }
  it('authenticates independent service principals at the real HTTP boundary', async () => {
    const url = `${base}/internal/core-connect/fynn/subscriptions/${state.subscription.id}/sync`;
    for (const token of [
      '',
      'Bearer user-session-token',
      'Bearer wrong-service',
    ]) {
      expect(
        (
          await fetch(url, {
            method: 'POST',
            headers: { Authorization: token },
          })
        ).status,
      ).toBe(401);
    }
    expect(
      (
        await fetch(url, {
          method: 'POST',
          headers: { Authorization: 'Bearer local-service-token' },
        })
      ).status,
    ).toBe(200);
    expect(await subscriptions()).toHaveLength(1);
  });
  it('synchronizes seat to usage, keeps replay stable and preserves state on provider failure', async () => {
    await run();
    const first = (await subscriptions())[0];
    expect(first.type).toBe('SEAT_BASED');
    expect(await run()).toMatchObject({ changed: false });
    expect((await subscriptions())[0].id).toBe(first.id);
    for (const entitlement of state.entitlements)
      entitlement.status =
        entitlement.status === 'pending' ? 'active' : 'expired';
    await run();
    expect((await subscriptions())[0].type).toBe('USAGE_BASED');
    available = false;
    await expect(run()).rejects.toThrow();
    expect((await subscriptions())[0].type).toBe('USAGE_BASED');
  });
  it('reconciliation expires the paid trial without an incoming webhook', async () => {
    state = structuredClone(fixtures.find((entry) => entry.case === '20')!);
    state.customer.customFields = { 'ayunis-core-uuid': orgId };
    await run();
    expect(await subscriptions()).toHaveLength(1);
    for (const entitlement of state.entitlements)
      entitlement.status = 'expired';
    for (const item of state.subscription.items)
      item.contractDetails.contractEnd = '2026-01-01T00:00:00Z';
    await reconcile.execute();
    expect(await subscriptions()).toHaveLength(0);
  });
  it('moves, unlinks and recreates access without reviving the previous organization', async () => {
    await run();
    const previous = orgId;
    const next = randomUUID();
    await db
      .getRepository(OrgRecord)
      .save({ id: next, name: 'Moved lifecycle test' });
    state.customer.customFields = { 'ayunis-core-uuid': next };
    await run();
    expect(await subscriptions(previous)).toHaveLength(0);
    expect(await subscriptions(next)).toHaveLength(1);
    state.customer.customFields = {};
    await run();
    expect(await subscriptions(next)).toHaveLength(0);
    state.customer.customFields = { 'ayunis-core-uuid': next };
    await run();
    expect(await subscriptions(next)).toHaveLength(1);
    subscriptionPresent = false;
    await reconcile.execute();
    expect(await subscriptions(next)).toHaveLength(0);
  });
  it('revokes a deleted customer immediately for customer and known-subscription triggers', async () => {
    await run();
    customerPresent = false;
    expect(
      await reconcile.execute({ customerId: state.customer.id }),
    ).toMatchObject({ changed: 1, failed: 0 });
    expect(await subscriptions()).toHaveLength(0);
    customerPresent = true;
    await run();
    customerPresent = false;
    expect(await run()).toMatchObject({ orgId: null, changed: true });
    expect(await subscriptions()).toHaveLength(0);
    expect(await db.getRepository(OrgAddonRecord).countBy({ orgId })).toBe(0);
    expect(await db.getRepository(FynnOrgLinkRecord).countBy({ orgId })).toBe(
      0,
    );
  });
  it('rolls paid access, trial, Academy, link and outbox back after a later persistence failure', async () => {
    const links = app.get(FynnOrgLinkRepository);
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
    expect(await db.getRepository(FynnOrgLinkRecord).countBy({ orgId })).toBe(
      0,
    );
    expect(await db.getRepository(FynnOutboxRecord).countBy({ orgId })).toBe(0);
  });
  it('persists failed external delivery for later retry without another state change', async () => {
    await run();
    const events = app.get(FynnSyncEventsService);
    sendWebhook.mockRejectedValueOnce(new Error('receiver unavailable'));
    await events.flush();
    expect(
      await db.getRepository(FynnOutboxRecord).countBy({ orgId }),
    ).toBeGreaterThan(0);
    await db
      .getRepository(FynnOutboxRecord)
      .update({ orgId }, { availableAt: new Date(0) });
    await run();
    sendWebhook.mockResolvedValue(undefined);
    await events.flush();
    expect(await db.getRepository(FynnOutboxRecord).countBy({ orgId })).toBe(0);
  });

  it('allows seat admission during provider discovery and rejects an older prepared snapshot', async () => {
    let reached!: () => void;
    let release!: () => void;
    const preparing = new Promise<void>((resolve) => {
      reached = resolve;
    });
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = structuredClone(state.entitlements);
    const sourceRead = jest
      .spyOn(source, 'getEntitlements')
      .mockImplementationOnce(async () => {
        reached();
        await barrier;
        return original;
      });
    const older = run();
    const rejected = expect(older).rejects.toThrow();
    try {
      await preparing;
      await host.withTransaction(() =>
        app.get(AcquireSeatAllocationLockUseCase).execute(orgId),
      );
      for (const item of state.subscription.items)
        if (item.currentMeasurementValue)
          item.currentMeasurementValue.quantity += 1;
      await run();
      const newer = await subscriptions();
      release();
      await rejected;
      expect(await subscriptions()).toEqual(newer);
    } finally {
      release();
      sourceRead.mockRestore();
      await Promise.allSettled([older]);
    }
  });

  function gate() {
    let enter!: () => void;
    let release!: () => void;
    const reached = new Promise<void>((resolve) => {
      enter = resolve;
    });
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    return { enter, release, reached, wait };
  }

  it('lets a prepared webhook finish when concurrent cleanup preserves access', async () => {
    await run();
    const pending = gate();
    jest.spyOn(source, 'getEntitlements').mockImplementationOnce(async () => {
      pending.enter();
      await pending.wait;
      return structuredClone(state.entitlements);
    });
    const applying = run();
    try {
      await pending.reached;
      expect(
        await app.get(RevokeUnlinkedFynnAccessUseCase).execute(),
      ).toMatchObject({ changed: 0, failed: 0 });
      pending.release();
      await expect(applying).resolves.toMatchObject({ changed: false });
      expect(await subscriptions()).toHaveLength(1);
    } finally {
      pending.release();
      await Promise.allSettled([applying]);
    }
  });

  it('rejects cleanup observed during preparation after that sync commits, even on replay', async () => {
    await run();
    const snapshot = gate();
    const discovery = gate();
    jest.spyOn(source, 'getEntitlements').mockImplementationOnce(async () => {
      snapshot.enter();
      await snapshot.wait;
      return structuredClone(state.entitlements);
    });
    const applying = run();
    let cleaning: Promise<unknown> | undefined;
    try {
      await snapshot.reached;
      jest.spyOn(source, 'getCustomer').mockImplementationOnce(async () => {
        discovery.enter();
        await discovery.wait;
        return { ...structuredClone(state.customer), customFields: {} };
      });
      cleaning = app.get(RevokeUnlinkedFynnAccessUseCase).execute();
      await discovery.reached;
      snapshot.release();
      await expect(applying).resolves.toMatchObject({ changed: false });
      discovery.release();
      await expect(cleaning).resolves.toMatchObject({ changed: 0, failed: 1 });
      expect(await subscriptions()).toHaveLength(1);
      expect(await db.getRepository(FynnOrgLinkRecord).countBy({ orgId })).toBe(
        1,
      );
    } finally {
      snapshot.release();
      discovery.release();
      await Promise.allSettled([applying, cleaning]);
    }
  });

  it('rejects an older prepared sync after cleanup commits revocation', async () => {
    await run();
    const pending = gate();
    jest.spyOn(source, 'getEntitlements').mockImplementationOnce(async () => {
      pending.enter();
      await pending.wait;
      return structuredClone(state.entitlements);
    });
    const applying = run();
    const rejected = expect(applying).rejects.toThrow();
    try {
      await pending.reached;
      customerPresent = false;
      expect(
        await app.get(RevokeUnlinkedFynnAccessUseCase).execute(),
      ).toMatchObject({ changed: 1, failed: 0 });
      pending.release();
      await rejected;
      expect(await subscriptions()).toHaveLength(0);
      expect(await db.getRepository(FynnOrgLinkRecord).countBy({ orgId })).toBe(
        0,
      );
    } finally {
      pending.release();
      await Promise.allSettled([applying]);
    }
  });

  it('rolls local cancellation cleanup back and never repeats it during external retry', async () => {
    state = structuredClone(fixtures.find((entry) => entry.case === '03')!);
    state.customer.customFields = { 'ayunis-core-uuid': orgId };
    await run();
    const limits = db.getRepository(DefaultUserCreditLimitRecord);
    await limits.save({ id: randomUUID(), orgId, monthlyCredits: 100 });
    state.subscription.status = 'terminated';
    const emitter = app.get(EventEmitter2);
    const fail = () => {
      throw new Error('later local listener failure');
    };
    emitter.on(SubscriptionCancelledEvent.EVENT_NAME, fail);
    await expect(run()).rejects.toThrow();
    emitter.off(SubscriptionCancelledEvent.EVENT_NAME, fail);
    expect(await subscriptions()).toHaveLength(1);
    expect(await limits.countBy({ orgId })).toBe(1);
    await run();
    expect(await limits.countBy({ orgId })).toBe(0);
    state.subscription.status = 'active';
    await run();
    await limits.save({ id: randomUUID(), orgId, monthlyCredits: 200 });
    const events = app.get(FynnSyncEventsService);
    sendWebhook.mockRejectedValueOnce(new Error('downstream unavailable'));
    await events.flush();
    await db
      .getRepository(FynnOutboxRecord)
      .update({ orgId }, { availableAt: new Date(0) });
    sendWebhook.mockResolvedValue(undefined);
    await events.flush();
    expect(await limits.findOneBy({ orgId })).toMatchObject({
      monthlyCredits: 200,
    });
  });
  it('boots independently with the environment flag off and performs no source reads', async () => {
    const oldFlag = process.env.FEATURE_FYNN_MANAGED_SUBSCRIPTIONS_ENABLED;
    const oldEnvironment = process.env.APP_ENVIRONMENT;
    process.env.FEATURE_FYNN_MANAGED_SUBSCRIPTIONS_ENABLED = 'false';
    process.env.APP_ENVIRONMENT = 'cloud';
    const disabled = await Test.createTestingModule(definition)
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          app: { isCloudHosted: true },
          features: featuresConfig(),
        }),
      )
      .compile();
    const second = disabled.createNestApplication({ logger: false });
    const reads = jest.spyOn(source, 'getSubscription');
    try {
      await second.init();
      await expect(
        second
          .get(SyncFynnSubscriptionUseCase)
          .execute({ subscriptionId: state.subscription.id }),
      ).rejects.toThrow();
      expect(reads).not.toHaveBeenCalled();
      expect(await subscriptions()).toHaveLength(0);
    } finally {
      reads.mockRestore();
      await second.close();
      if (oldFlag === undefined)
        delete process.env.FEATURE_FYNN_MANAGED_SUBSCRIPTIONS_ENABLED;
      else process.env.FEATURE_FYNN_MANAGED_SUBSCRIPTIONS_ENABLED = oldFlag;
      if (oldEnvironment === undefined) delete process.env.APP_ENVIRONMENT;
      else process.env.APP_ENVIRONMENT = oldEnvironment;
    }
  });
  async function expiredInvite() {
    return db.getRepository(InviteRecord).save({
      id: randomUUID(),
      orgId,
      email: `expired-${randomUUID()}@example.test`,
      role: UserRole.USER,
      expiresAt: new Date(0),
    });
  }
  it('restores the expired invitation when replacement insertion fails after deletion', async () => {
    const original = await expiredInvite();
    const failure = jest
      .spyOn(app.get(InvitesRepository), 'create')
      .mockRejectedValueOnce(new Error('insertion failed'));
    try {
      await expect(
        app
          .get(ResendExpiredInviteUseCase)
          .execute({ inviteId: original.id, orgId }),
      ).rejects.toThrow();
    } finally {
      failure.mockRestore();
    }
    expect(
      await db.getRepository(InviteRecord).findOneBy({ id: original.id }),
    ).toMatchObject({ email: original.email });
    expect(await db.getRepository(InviteRecord).countBy({ orgId })).toBe(1);
  });
  it('keeps another allocation transaction waiting through invite replacement', async () => {
    const original = await expiredInvite();
    let inserted!: () => void;
    let release!: () => void;
    const replacing = new Promise<void>((resolve) => {
      inserted = resolve;
    });
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const invites = app.get(InvitesRepository);
    const create = invites.create.bind(invites);
    const paused = jest
      .spyOn(invites, 'create')
      .mockImplementation(async (invite: Invite) => {
        inserted();
        await barrier;
        await create(invite);
      });
    const resend = app
      .get(ResendExpiredInviteUseCase)
      .execute({ inviteId: original.id, orgId });
    await replacing;
    let entered = false;
    const admission = host.withTransaction(async () => {
      await app.get(AcquireSeatAllocationLockUseCase).execute(orgId);
      entered = true;
      return host.tx.getRepository(InviteRecord).countBy({ orgId });
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(entered).toBe(false);
      release();
      await resend;
      expect(await admission).toBe(1);
    } finally {
      release();
      paused.mockRestore();
      await Promise.allSettled([resend, admission]);
    }
  });
});
