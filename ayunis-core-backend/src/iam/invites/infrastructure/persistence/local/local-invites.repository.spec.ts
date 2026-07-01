import { randomUUID } from 'crypto';
import { ILike, IsNull, LessThan, type Repository } from 'typeorm';

import { LocalInvitesRepository } from './local-invites.repository';
import { InviteRecord } from './schema/invite.record';
import { InviteMapper } from './mappers/invite.mapper';
import { UserRole } from '../../../../users/domain/value-objects/role.object';

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
    Pick<Repository<InviteRecord>, 'findOne' | 'count' | 'delete'>
  >;
  let repository: LocalInvitesRepository;

  beforeEach(() => {
    inviteRepo = { findOne: jest.fn(), count: jest.fn(), delete: jest.fn() };
    repository = new LocalInvitesRepository(
      inviteRepo as unknown as Repository<InviteRecord>,
      new InviteMapper(),
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

  describe('deleteExpiredBefore', () => {
    // The TTL purge must only remove pending invites: accepted invites are
    // retained for referential integrity (AYC-299). Any purge that dropped the
    // acceptedAt filter would delete live, accepted invitations.
    it('deletes only unaccepted invites expiring before the cutoff', async () => {
      const cutoff = new Date('2026-06-01T00:00:00Z');
      inviteRepo.delete.mockResolvedValue({ affected: 4, raw: [] });

      const deleted = await repository.deleteExpiredBefore(cutoff);

      expect(deleted).toBe(4);
      expect(inviteRepo.delete).toHaveBeenCalledWith({
        expiresAt: LessThan(cutoff),
        acceptedAt: IsNull(),
      });
    });

    it('reports zero when no rows match', async () => {
      inviteRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

      const deleted = await repository.deleteExpiredBefore(
        new Date('2026-06-01T00:00:00Z'),
      );

      expect(deleted).toBe(0);
    });

    it('treats a missing affected count as zero deletions', async () => {
      inviteRepo.delete.mockResolvedValue({
        affected: undefined,
        raw: [],
      });

      const deleted = await repository.deleteExpiredBefore(
        new Date('2026-06-01T00:00:00Z'),
      );

      expect(deleted).toBe(0);
    });
  });

  describe('countExpiredBefore', () => {
    it('counts only unaccepted invites expiring before the cutoff', async () => {
      const cutoff = new Date('2026-06-01T00:00:00Z');
      inviteRepo.count.mockResolvedValue(7);

      const count = await repository.countExpiredBefore(cutoff);

      expect(count).toBe(7);
      expect(inviteRepo.count).toHaveBeenCalledWith({
        where: {
          expiresAt: LessThan(cutoff),
          acceptedAt: IsNull(),
        },
      });
    });
  });
});
