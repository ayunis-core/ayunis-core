import { LessThan, type Repository } from 'typeorm';

import { LocalApiKeysRepository } from './local-api-keys.repository';
import type { ApiKeyRecord } from './schema/api-key.record';

describe('LocalApiKeysRepository', () => {
  let apiKeyRepo: jest.Mocked<
    Pick<Repository<ApiKeyRecord>, 'count' | 'delete'>
  >;
  let repository: LocalApiKeysRepository;

  beforeEach(() => {
    apiKeyRepo = { count: jest.fn(), delete: jest.fn() };
    repository = new LocalApiKeysRepository(
      apiKeyRepo as unknown as Repository<ApiKeyRecord>,
    );
  });

  describe('deleteExpiredBefore', () => {
    // Keys with a NULL expiry (including revoked-but-not-expired keys) must be
    // left untouched — `LessThan` on expires_at never matches NULL rows.
    it('deletes keys with an expiry before the cutoff', async () => {
      const cutoff = new Date('2026-06-01T00:00:00Z');
      apiKeyRepo.delete.mockResolvedValue({ affected: 3, raw: [] });

      const deleted = await repository.deleteExpiredBefore(cutoff);

      expect(deleted).toBe(3);
      expect(apiKeyRepo.delete).toHaveBeenCalledWith({
        expiresAt: LessThan(cutoff),
      });
    });

    it('treats a missing affected count as zero deletions', async () => {
      apiKeyRepo.delete.mockResolvedValue({ affected: undefined, raw: [] });

      const deleted = await repository.deleteExpiredBefore(
        new Date('2026-06-01T00:00:00Z'),
      );

      expect(deleted).toBe(0);
    });
  });

  describe('countExpiredBefore', () => {
    it('counts keys with an expiry before the cutoff', async () => {
      const cutoff = new Date('2026-06-01T00:00:00Z');
      apiKeyRepo.count.mockResolvedValue(6);

      const count = await repository.countExpiredBefore(cutoff);

      expect(count).toBe(6);
      expect(apiKeyRepo.count).toHaveBeenCalledWith({
        where: { expiresAt: LessThan(cutoff) },
      });
    });
  });
});
