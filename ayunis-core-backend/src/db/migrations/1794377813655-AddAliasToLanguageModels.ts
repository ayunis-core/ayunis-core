import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAliasToLanguageModels1794377813655 implements MigrationInterface {
  name = 'AddAliasToLanguageModels1794377813655';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "models" ADD "alias" character varying`,
    );
    // Provider names are only unique per provider, so the same name can
    // exist under several providers on any deployment. The non-archived,
    // oldest row keeps the name as its alias; the others get the provider
    // appended, or their id if that is already another model's name, so the
    // unique index can be created.
    await queryRunner.query(`
            UPDATE "models" AS m
            SET "alias" = CASE
                WHEN ranked.rank = 1 THEN m."name"
                WHEN NOT EXISTS (
                    SELECT 1 FROM "models" AS other
                    WHERE other."type" = 'language'
                    AND other."name" = m."name" || '-' || m."provider"::text
                ) THEN m."name" || '-' || m."provider"::text
                ELSE m."name" || '-' || m."id"::text
            END
            FROM (
                SELECT "id", ROW_NUMBER() OVER (
                    PARTITION BY "name"
                    ORDER BY "isArchived" ASC, "createdAt" ASC, "id" ASC
                ) AS rank
                FROM "models"
                WHERE "type" = 'language'
            ) AS ranked
            WHERE m."id" = ranked."id"
        `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_6018092adfdf6e9be8dc78df49" ON "models" ("alias") `,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ADD CONSTRAINT "CHK_f09127074dce14ba69c64dcfc9" CHECK ("type" <> 'language' OR "alias" IS NOT NULL)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "models" DROP CONSTRAINT "CHK_f09127074dce14ba69c64dcfc9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6018092adfdf6e9be8dc78df49"`,
    );
    await queryRunner.query(`ALTER TABLE "models" DROP COLUMN "alias"`);
  }
}
