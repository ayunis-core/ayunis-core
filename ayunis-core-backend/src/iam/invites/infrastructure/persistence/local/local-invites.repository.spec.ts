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
  let repository: LocalInvitesRepository;

  beforeEach(() => {
    inviteRepo = { findOne: jest.fn() };
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
});
