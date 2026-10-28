import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCleanupIndexesToRefreshTokensAndMessages1791818310647 implements MigrationInterface {
  name = 'AddCleanupIndexesToRefreshTokensAndMessages1791818310647';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_15f9bd2bf472ff12b6ee20012d"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_37e3e110ca0d8b7a51ef50f256" ON "messages" ("threadId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_56b91d98f71e3d1b649ed6e9f3" ON "refresh_tokens" ("expiresAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6077443266dc1dde0ac43b6f72" ON "refresh_tokens" ("replacedByTokenId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6077443266dc1dde0ac43b6f72"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_56b91d98f71e3d1b649ed6e9f3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_37e3e110ca0d8b7a51ef50f256"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_15f9bd2bf472ff12b6ee20012d" ON "messages" ("threadId") `,
    );
  }
}
