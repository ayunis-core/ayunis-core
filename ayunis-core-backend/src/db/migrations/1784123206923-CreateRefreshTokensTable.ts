import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokensTable1784123206923 implements MigrationInterface {
  name = 'CreateRefreshTokensTable1784123206923';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "familyId" character varying NOT NULL, "tokenHash" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, "revokedAt" TIMESTAMP WITH TIME ZONE, "replacedByTokenId" character varying, CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_610102b60fea1455310ccd299d" ON "refresh_tokens" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_40e9a8b923a1b3fb4429a5c624" ON "refresh_tokens" ("familyId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c25bc63d248ca90e8dcc1d92d0" ON "refresh_tokens" ("tokenHash") `,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c25bc63d248ca90e8dcc1d92d0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_40e9a8b923a1b3fb4429a5c624"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_610102b60fea1455310ccd299d"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
  }
}
