import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Skipping the removed personalization card saved `-` as the user system
 * prompt, which every chat then received as the user's instructions. Only the
 * exact placeholder is deleted; a prompt that merely contains `-` was written
 * by the user.
 */
export class DeleteSkippedPersonalizationSystemPrompts1795173508718 implements MigrationInterface {
  name = 'DeleteSkippedPersonalizationSystemPrompts1795173508718';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "user_system_prompts" WHERE "systemPrompt" = '-'`,
    );
  }

  public async down(): Promise<void> {
    // Restoring a placeholder the product no longer reads has no value.
  }
}
