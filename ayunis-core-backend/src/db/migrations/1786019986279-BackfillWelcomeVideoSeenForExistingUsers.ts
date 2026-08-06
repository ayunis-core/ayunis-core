import type { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillWelcomeVideoSeenForExistingUsers1786019986279 implements MigrationInterface {
  name = 'BackfillWelcomeVideoSeenForExistingUsers1786019986279';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO "onboarding" ("id", "userId", "welcomeVideoSeenAt", "createdAt", "updatedAt")
       SELECT gen_random_uuid()::text, "id", NOW(), NOW(), NOW()
       FROM "users"
       ON CONFLICT ("userId") DO UPDATE
       SET "welcomeVideoSeenAt" = COALESCE(onboarding."welcomeVideoSeenAt", EXCLUDED."welcomeVideoSeenAt"),
           "updatedAt" = NOW()`,
    );
  }

  public async down(): Promise<void> {
    // Clearing the marker would show the welcome video to existing users.
    // Intentional no-op.
  }
}
