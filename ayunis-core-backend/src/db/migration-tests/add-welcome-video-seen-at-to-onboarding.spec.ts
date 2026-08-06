import type { QueryRunner } from 'typeorm';
import { BackfillWelcomeVideoSeenForExistingUsers1786019986279 } from '../migrations/1786019986279-BackfillWelcomeVideoSeenForExistingUsers';

describe('BackfillWelcomeVideoSeenForExistingUsers1786019986279', () => {
  it('marks every existing user as having seen the welcome video', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const queryRunner = { query } as unknown as QueryRunner;
    const migration =
      new BackfillWelcomeVideoSeenForExistingUsers1786019986279();

    await migration.up(queryRunner);

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('INSERT INTO "onboarding"'),
    );
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT gen_random_uuid()::text, "id", NOW()'),
    );
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM "users"'),
    );
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('ON CONFLICT ("userId") DO UPDATE'),
    );
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining(
        'COALESCE(onboarding."welcomeVideoSeenAt", EXCLUDED."welcomeVideoSeenAt")',
      ),
    );
  });
});
