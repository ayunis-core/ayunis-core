import { randomUUID } from 'crypto';
import { ILike, IsNull, type Repository } from 'typeorm';

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
  let inviteRepo: jest.Mocked<Pick<Repository<InviteRecord>, 'findOne'>>;
  let txHost: {
    tx: { getRepository: jest.Mock };
    isTransactionActive: () => boolean;
  };
  let repository: LocalInvitesRepository;

  beforeEach(() => {
    inviteRepo = { findOne: jest.fn() };
    // Reads resolve through txHost.tx, which outside a transaction is the
    // adapter's fallback manager rather than undefined.
    txHost = {
      tx: { getRepository: jest.fn().mockReturnValue(inviteRepo) },
      isTransactionActive: () => false,
    };
    repository = new LocalInvitesRepository(
      new InviteMapper(),
      txHost as never,
    );
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

      const where = inviteRepo.findOne.mock.calls[0][0].where;
      expect(where).toEqual({ email: ILike('user@example.com') });
      expect(where).not.toHaveProperty('acceptedAt', IsNull());
    });

    it('returns null when no invite exists for the email', async () => {
      inviteRepo.findOne.mockResolvedValue(null);

      const result = await repository.findOneByEmail('missing@example.com');

      expect(result).toBeNull();
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
});
