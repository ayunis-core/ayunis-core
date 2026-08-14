import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddZitadelSessionIdToRefreshTokens1786719279845 implements MigrationInterface {
  name = 'AddZitadelSessionIdToRefreshTokens1786719279845';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "zitadelSessionId" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_302542d003274a087887a5d188" ON "refresh_tokens" ("zitadelSessionId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_302542d003274a087887a5d188"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "zitadelSessionId"`,
    );
  }
}
