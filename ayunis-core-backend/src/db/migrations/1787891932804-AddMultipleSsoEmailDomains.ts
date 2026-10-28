import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultipleSsoEmailDomains1787891932804 implements MigrationInterface {
  name = 'AddMultipleSsoEmailDomains1787891932804';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "org_sso_email_domains" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgSsoConnectionId" character varying NOT NULL, "emailDomain" character varying(253) NOT NULL, "verifiedAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "UQ_3e9920e89c432ea23f504c4b0c8" UNIQUE ("emailDomain"), CONSTRAINT "CHK_58a61fc5e8b97774fbe483df3c" CHECK ("emailDomain" ~ '^([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9])([.]([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9]))+$'), CONSTRAINT "CHK_da30b33ceb66cced32f4ec7be9" CHECK ("emailDomain" = lower(btrim("emailDomain"))), CONSTRAINT "PK_6f2be02c8966e794e0424b05077" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0022049e300fbdf71486327992" ON "org_sso_email_domains" ("orgSsoConnectionId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "org_sso_email_domains" ADD CONSTRAINT "FK_0022049e300fbdf714863279923" FOREIGN KEY ("orgSsoConnectionId") REFERENCES "org_sso_connections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "org_sso_email_domains" ("id", "createdAt", "updatedAt", "orgSsoConnectionId", "emailDomain", "verifiedAt") SELECT gen_random_uuid()::varchar, "createdAt", "updatedAt", "id", "emailDomain", "domainVerifiedAt" FROM "org_sso_connections"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "org_sso_email_domains" DROP CONSTRAINT "FK_0022049e300fbdf714863279923"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0022049e300fbdf71486327992"`,
    );
    await queryRunner.query(`DROP TABLE "org_sso_email_domains"`);
  }
}
