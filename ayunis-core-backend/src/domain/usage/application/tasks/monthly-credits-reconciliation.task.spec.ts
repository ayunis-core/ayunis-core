import { checkIn } from '@appsignal/nodejs';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import type { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';
import type { CreditReconciliationLock } from 'src/domain/usage/application/ports/credit-reconciliation-lock.port';
import { MonthlyCreditsSnapshotEvent } from 'src/domain/usage/application/events/monthly-credits-snapshot.event';
import {
  MonthlyCreditsReconciliationTask,
  reconciliationPeriods,
} from './monthly-credits-reconciliation.task';

jest.mock('@appsignal/nodejs', () => ({ checkIn: { cron: jest.fn() } }));

const cronMock = jest.mocked(checkIn.cron);
const ORG_A = '11111111-1111-4111-8111-111111111111' as UUID;
const ORG_B = '22222222-2222-4222-8222-222222222222' as UUID;

describe('MonthlyCreditsReconciliationTask', () => {
  let reconciliationLock: jest.Mocked<CreditReconciliationLock>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-10-07T12:00:00.000Z'));
    cronMock.mockImplementation((_identifier, callback) => callback());
    reconciliationLock = {
      runExclusive: jest.fn(async (callback) => {
        await callback();
        return true;
      }),
    };
  });

  afterEach(() => jest.useRealTimers());

  it('emits the previous month and settled current-month totals under one lock', async () => {
    const usageRepository = {
      getCreditTotalsByOrganization: jest
        .fn()
        .mockResolvedValueOnce([
          { organizationId: ORG_A, creditsConsumed: 900 },
        ])
        .mockResolvedValueOnce([
          { organizationId: ORG_A, creditsConsumed: 1250 },
          { organizationId: ORG_B, creditsConsumed: 40 },
        ]),
    } as unknown as UsageRepository;
    const eventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) };
    const task = new MonthlyCreditsReconciliationTask(
      usageRepository,
      eventEmitter as unknown as EventEmitter2,
      reconciliationLock,
    );

    await task.handleDailyReconciliation();

    expect(cronMock).toHaveBeenCalledWith(
      'monthly_credits_reconciliation',
      expect.any(Function),
    );
    expect(
      usageRepository.getCreditTotalsByOrganization,
    ).toHaveBeenNthCalledWith(
      1,
      new Date('2026-09-01T00:00:00.000Z'),
      new Date('2026-10-01T00:00:00.000Z'),
    );
    expect(
      usageRepository.getCreditTotalsByOrganization,
    ).toHaveBeenNthCalledWith(
      2,
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-06T00:00:00.000Z'),
    );
    expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(3);
    expect(eventEmitter.emitAsync).toHaveBeenNthCalledWith(
      1,
      MonthlyCreditsSnapshotEvent.EVENT_NAME,
      new MonthlyCreditsSnapshotEvent({
        organizationId: ORG_A,
        periodStart: new Date('2026-09-01T00:00:00.000Z'),
        periodEnd: new Date('2026-10-01T00:00:00.000Z'),
        creditsConsumed: 900,
      }),
    );
    expect(reconciliationLock.runExclusive).toHaveBeenCalledTimes(1);
  });

  it('skips aggregation when another replica owns the reconciliation lock', async () => {
    const usageRepository = {
      getCreditTotalsByOrganization: jest.fn(),
    } as unknown as UsageRepository;
    const eventEmitter = { emitAsync: jest.fn() };
    reconciliationLock.runExclusive.mockResolvedValue(false);
    const task = new MonthlyCreditsReconciliationTask(
      usageRepository,
      eventEmitter as unknown as EventEmitter2,
      reconciliationLock,
    );

    await task.handleDailyReconciliation();

    expect(
      usageRepository.getCreditTotalsByOrganization,
    ).not.toHaveBeenCalled();
    expect(cronMock).not.toHaveBeenCalled();
  });

  it('continues other organizations and fails the monitor callback when delivery fails', async () => {
    const usageRepository = {
      getCreditTotalsByOrganization: jest
        .fn()
        .mockResolvedValueOnce([
          { organizationId: ORG_A, creditsConsumed: 900 },
          { organizationId: ORG_B, creditsConsumed: 40 },
        ])
        .mockResolvedValueOnce([]),
    } as unknown as UsageRepository;
    const eventEmitter = {
      emitAsync: jest
        .fn()
        .mockRejectedValueOnce(new Error('Connect unavailable'))
        .mockResolvedValueOnce([]),
    };
    let monitoredFailure: unknown;
    cronMock.mockImplementation(async (_identifier, callback) => {
      try {
        await callback();
      } catch (error) {
        monitoredFailure = error;
        throw error;
      }
    });
    const task = new MonthlyCreditsReconciliationTask(
      usageRepository,
      eventEmitter as unknown as EventEmitter2,
      reconciliationLock,
    );

    await task.handleDailyReconciliation();

    expect(eventEmitter.emitAsync).toHaveBeenCalledTimes(2);
    expect(monitoredFailure).toEqual(
      new Error('1 monthly credit snapshot delivery failed'),
    );
  });
});

describe('reconciliationPeriods', () => {
  it('keeps the last day of the previous month inside the settling buffer', () => {
    expect(reconciliationPeriods(new Date('2027-01-01T03:00:00.000Z'))).toEqual(
      [
        {
          start: new Date('2026-12-01T00:00:00.000Z'),
          end: new Date('2026-12-31T00:00:00.000Z'),
        },
      ],
    );
  });

  it('uses only the closed previous month before current-month data settles', () => {
    expect(reconciliationPeriods(new Date('2027-01-02T03:00:00.000Z'))).toEqual(
      [
        {
          start: new Date('2026-12-01T00:00:00.000Z'),
          end: new Date('2027-01-01T00:00:00.000Z'),
        },
      ],
    );
  });
});
