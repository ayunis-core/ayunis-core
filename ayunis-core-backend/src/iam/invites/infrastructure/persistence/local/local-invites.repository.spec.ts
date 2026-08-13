import { randomUUID } from 'crypto';
import { createPinoLoggerMock } from 'src/common/testing/pino-logger.mock';
import { IsNull, type FindOperator, type Repository } from 'typeorm';

import { LocalInvitesRepository } from './local-invites.repository';
import { InviteRecord } from './schema/invite.record';
import { InviteMapper } from './mappers/invite.mapper';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

function makeAcceptedInviteRecord(email: string): InviteRecord {
  const record = new InviteRecord();
  record.id = randomUUID();
  record.email = email;
  record.orgId = randomUUID();
  record.role = UserRole.USER;
  record.acceptedAt = new Date('2026-01-01T00:00:00Z');
  record.expiresAt = new Date('2026-02-01T00:00:00Z');
  record.createdAt = new Date('2026-01-01T00:00:00Z');
  record.updatedAt = new Date('2026-01-01T00:00:00Z');
  return record;
}

describe('LocalInvitesRepository', () => {
  let inviteRepo: jest.Mocked<
    Pick<Repository<InviteRecord>, 'findOne' | 'update' | 'createQueryBuilder'>
  >;
  let txHost: {
    tx: { getRepository: jest.Mock };
    isTransactionActive: () => boolean;
  };
  let repository: LocalInvitesRepository;

  beforeEach(() => {
    inviteRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    // Reads resolve through txHost.tx, which outside a transaction is the
    // adapter's fallback manager rather than undefined.
    txHost = {
      tx: { getRepository: jest.fn().mockReturnValue(inviteRepo) },
      isTransactionActive: () => false,
    };
    repository = new LocalInvitesRepository(
      createPinoLoggerMock(),
      new InviteMapper(),
      txHost as never,
    );
  });

  describe('accept', () => {
    it('accepts only a still-pending invite', async () => {
      inviteRepo.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      await expect(repository.accept(randomUUID())).resolves.toBe(true);
      expect(inviteRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ acceptedAt: IsNull() }),
        expect.objectContaining({ acceptedAt: expect.any(Date) }),
      );
    });

    it('reports a concurrent acceptance without overwriting it', async () => {
      inviteRepo.update.mockResolvedValue({
        affected: 0,
        raw: [],
        generatedMaps: [],
      });

      await expect(repository.accept(randomUUID())).resolves.toBe(false);
    });
  });

  describe('findOneByEmail', () => {
    // Regression test for AYC-299: deleting a user fails to clean up the
    // user's already-accepted invite, so re-inviting the same email hits the
    // global UNIQUE constraint on invites.email. The deletion path looks the
    // invite up via findOneByEmail, which must therefore match accepted
    // invites too — not just pending ones.
    it('returns an invite even when it has already been accepted', async () => {
      const accepted = makeAcceptedInviteRecord('user@example.com');
      inviteRepo.findOne.mockResolvedValue(accepted);

      const result = await repository.findOneByEmail('user@example.com');

      expect(result).not.toBeNull();
      expect(result?.id).toBe(accepted.id);

      const where = inviteRepo.findOne.mock.calls[0][0].where as {
        email: FindOperator<string>;
        acceptedAt?: FindOperator<Date>;
      };
      expect(where.email.type).toBe('raw');
      expect(where.email.objectLiteralParameters).toEqual({
        normalizedEmail: 'user@example.com',
      });
      expect(where).not.toHaveProperty('acceptedAt', IsNull());
    });

    it('returns null when no invite exists for the email', async () => {
      inviteRepo.findOne.mockResolvedValue(null);

      const result = await repository.findOneByEmail('missing@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findOneByEmailAndOrg', () => {
    it('uses exact case-insensitive equality for emails containing SQL wildcards', async () => {
      inviteRepo.findOne.mockResolvedValue(null);
      const orgId = randomUUID();

      await repository.findOneByEmailAndOrg(
        '  Anna_Schmidt@Example.com  ',
        orgId,
      );

      const where = inviteRepo.findOne.mock.calls[0][0].where as {
        email: FindOperator<string>;
      };
      expect(where.email.type).toBe('raw');
      expect(where.email.objectLiteralParameters).toEqual({
        normalizedEmail: 'anna_schmidt@example.com',
      });
      expect(where.email.getSql?.('invite.email')).toBe(
        'LOWER(invite.email) = :normalizedEmail',
      );
    });
  });

  // AYC-627: writes must land in the caller's transaction, otherwise an outer
  // rollback leaves committed rows behind.
  describe('ambient transaction', () => {
    it('resolves reads through the transactional entity manager', async () => {
      const txRepo = { findOne: jest.fn().mockResolvedValue(null) };
      txHost.tx = { getRepository: jest.fn().mockReturnValue(txRepo) };
      txHost.isTransactionActive = () => true;

      await repository.findOneByEmail('user@example.com');

      expect(txRepo.findOne).toHaveBeenCalled();
      expect(inviteRepo.findOne).not.toHaveBeenCalled();
    });

    it('never reads from the injected repository directly', async () => {
      inviteRepo.findOne.mockResolvedValue(null);

      await repository.findOneByEmail('user@example.com');

      // routed via txHost.tx.getRepository, which the fixture maps back to inviteRepo
      expect(txHost.tx.getRepository).toHaveBeenCalledWith(InviteRecord);
    });
  });

  describe('findByEmails', () => {
    // Regression test for AYC-735: invites.email is globally unique, so bulk
    // validation must look up invites globally — case-insensitively and
    // regardless of organization or acceptance status — otherwise a conflicting
    // row (in another org, or accepted/orphaned) slips past validation and
    // fails the batch insert with a DB unique violation surfaced as a 500.
    it('queries globally and case-insensitively with no org/acceptance filter', async () => {
      const accepted = makeAcceptedInviteRecord('user@example.com');
      const where = jest.fn().mockReturnThis();
      const andWhere = jest.fn().mockReturnThis();
      const getMany = jest.fn().mockResolvedValue([accepted]);
      inviteRepo.createQueryBuilder.mockReturnValue({
        where,
        andWhere,
        getMany,
      } as never);

      const result = await repository.findByEmails([
        'User@Example.com',
        'Second@Example.com',
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(accepted.id);

      // Only a single, global WHERE on lowercased emails — no org or
      // acceptedAt constraints.
      expect(where).toHaveBeenCalledTimes(1);
      expect(where).toHaveBeenCalledWith(
        'LOWER(invite.email) IN (:...emails)',
        {
          emails: ['user@example.com', 'second@example.com'],
        },
      );
      expect(andWhere).not.toHaveBeenCalled();
    });

    it('returns an empty array without querying when no emails are given', async () => {
      const result = await repository.findByEmails([]);

      expect(result).toEqual([]);
      expect(inviteRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
