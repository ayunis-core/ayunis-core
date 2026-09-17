import { randomUUID } from 'crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { LocalPersonalCreditReservationRepository } from './local-personal-credit-reservation.repository';
import { UserCreditLimitRecord } from 'src/iam/credit-limits/infrastructure/persistence/local/schema/credit-limit.record';
import { PersonalCreditReservationRecord } from 'src/iam/credit-limits/infrastructure/persistence/local/schema/personal-credit-reservation.record';
import { UsageRecord } from 'src/domain/usage/infrastructure/persistence/local-usage/schema/usage.record';

describe('LocalPersonalCreditReservationRepository', () => {
  it('inserts a new reservation without a save preflight read', async () => {
    const orgId = randomUUID();
    const userId = randomUUID();
    const limitQuery = queryBuilderReturning({ monthlyCredits: 1_000 });
    const usageQuery = queryBuilderReturning({ total: '100' });
    const reservationQuery = queryBuilderReturning({ total: '200' });
    const insert = jest.fn().mockResolvedValue({ identifiers: [] });
    const save = jest.fn();
    const reservationRepository = {
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
      createQueryBuilder: jest.fn().mockReturnValue(reservationQuery),
      create: jest.fn((record) => record),
      insert,
      save,
    };
    const manager = {
      getRepository: jest.fn((record) => {
        if (record === UserCreditLimitRecord) {
          return { createQueryBuilder: jest.fn().mockReturnValue(limitQuery) };
        }
        if (record === UsageRecord) {
          return { createQueryBuilder: jest.fn().mockReturnValue(usageQuery) };
        }
        if (record === PersonalCreditReservationRecord) {
          return reservationRepository;
        }
        throw new Error('Unexpected record');
      }),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(async (work) => work(manager)),
    } as unknown as DataSource;
    const repository = new LocalPersonalCreditReservationRepository(dataSource);

    const result = await repository.reserve({
      orgId,
      userId,
      requestedCredits: 500,
      minimumCredits: 50,
      monthStart: new Date('2026-09-01T00:00:00.000Z'),
      now: new Date('2026-09-17T10:00:00.000Z'),
      expiresAt: new Date('2026-09-17T11:00:00.000Z'),
    });

    expect(result).toMatchObject({
      status: 'reserved',
      reservation: { credits: 500 },
    });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });

  it('locks the personal limit row before releasing a reservation', async () => {
    const reservationId = randomUUID();
    const orgId = randomUUID();
    const userId = randomUUID();
    const reservation = { id: reservationId, orgId, userId };
    const getOne = jest.fn().mockResolvedValue({ id: randomUUID() });
    const queryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne,
    };
    const reservationRepository = {
      findOne: jest.fn().mockResolvedValue(reservation),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const limitRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const manager = {
      getRepository: jest.fn((record) =>
        record === UserCreditLimitRecord
          ? limitRepository
          : reservationRepository,
      ),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(async (work) => work(manager)),
    } as unknown as DataSource;
    const repository = new LocalPersonalCreditReservationRepository(dataSource);

    await repository.release({ reservationId, orgId, userId });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(reservationRepository.findOne).toHaveBeenCalledWith({
      where: { id: reservationId, orgId, userId },
    });
    expect(limitRepository.createQueryBuilder).toHaveBeenCalledWith(
      'creditLimit',
    );
    expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'creditLimit.orgId = :orgId',
      { orgId },
    );
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      'creditLimit.userId = :userId',
      { userId },
    );
    expect(getOne.mock.invocationCallOrder[0]).toBeLessThan(
      reservationRepository.delete.mock.invocationCallOrder[0],
    );
    expect(reservationRepository.delete).toHaveBeenCalledWith({
      id: reservationId,
      orgId,
      userId,
    });
  });

  it('does not lock or delete when the reservation is already gone', async () => {
    const reservationRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      delete: jest.fn(),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(reservationRepository),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn(async (work) => work(manager)),
    } as unknown as DataSource;
    const repository = new LocalPersonalCreditReservationRepository(dataSource);

    await repository.release({
      reservationId: randomUUID(),
      orgId: randomUUID(),
      userId: randomUUID(),
    });

    expect(manager.getRepository).toHaveBeenCalledTimes(1);
    expect(reservationRepository.delete).not.toHaveBeenCalled();
  });
});

const queryBuilderReturning = (row: unknown) => ({
  select: jest.fn().mockReturnThis(),
  setLock: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockResolvedValue(row),
  getRawOne: jest.fn().mockResolvedValue(row),
});
