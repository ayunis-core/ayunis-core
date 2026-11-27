import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAttentionMechanismToReleaseNotes1795773629211 implements MigrationInterface {
  name = 'AddAttentionMechanismToReleaseNotes1795773629211';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."release_notes_attentionmechanism_enum" AS ENUM('instant_open', 'show_indicator')`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_notes" ADD "attentionMechanism" "public"."release_notes_attentionmechanism_enum" NOT NULL DEFAULT 'show_indicator'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "release_notes" DROP COLUMN "attentionMechanism"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."release_notes_attentionmechanism_enum"`,
    );
  }
}
