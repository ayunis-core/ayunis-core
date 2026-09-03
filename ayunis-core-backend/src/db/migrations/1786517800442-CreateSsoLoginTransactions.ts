import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSsoLoginTransactions1786517800442 implements MigrationInterface {
  name = 'CreateSsoLoginTransactions1786517800442';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sso_login_transactions" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "state_hash" character varying(64) NOT NULL, "browser_binding_hash" character varying(64) NOT NULL, "post_login_path" character varying(255) NOT NULL, "encrypted_code_verifier" text NOT NULL, "encrypted_nonce" text NOT NULL, "org_id" character varying NOT NULL, "zitadel_org_id" character varying(255) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "consumed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_a8d84c62b938ea1f7dc8a8c0f08" UNIQUE ("state_hash"), CONSTRAINT "PK_30e4a1b1230188130780e456ef6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ebdcd92b65c9e14631dca96d28" ON "sso_login_transactions" ("expires_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_login_transactions" ADD CONSTRAINT "FK_ace2df42b9a0a22c7ad2813c4ec" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sso_login_transactions" DROP CONSTRAINT "FK_ace2df42b9a0a22c7ad2813c4ec"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ebdcd92b65c9e14631dca96d28"`,
    );
    await queryRunner.query(`DROP TABLE "sso_login_transactions"`);
  }
}
