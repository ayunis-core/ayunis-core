import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerUserMcpOAuth1785786216902 implements MigrationInterface {
  name = 'AddPerUserMcpOAuth1785786216902';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "mcp_oauth_user_tokens" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "integration_id" character varying NOT NULL, "user_id" character varying NOT NULL, "issuer" text NOT NULL, "encrypted_access_token" text NOT NULL, "encrypted_refresh_token" text, "expires_at" TIMESTAMP WITH TIME ZONE, "token_type" text, "scopes" text array NOT NULL DEFAULT '{}', CONSTRAINT "UQ_95db09f5b01286549b8cab4cd37" UNIQUE ("integration_id", "user_id"), CONSTRAINT "PK_ffc79ffe6b90decbffcd8461cf7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "mcp_oauth_pending_sessions" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "state_hash" text NOT NULL, "encrypted_code_verifier" text NOT NULL, "redirect_uri" text NOT NULL, "integration_id" character varying NOT NULL, "org_id" character varying NOT NULL, "user_id" character varying NOT NULL, "issuer" text NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "consumed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_a644f37fb1679b395088cd18401" UNIQUE ("state_hash"), CONSTRAINT "PK_937c34ad8cada78f9a96193c2ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "mcp_oauth_client_registrations" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "integration_id" character varying NOT NULL, "issuer" text, "registration_mode" text NOT NULL, "client_id" text NOT NULL, "encrypted_client_secret" text, "client_secret_expires_at" TIMESTAMP WITH TIME ZONE, "discovery_metadata" jsonb, CONSTRAINT "UQ_77a1cd95db6aad0f3da523b6505" UNIQUE ("integration_id", "issuer"), CONSTRAINT "PK_44bf2453fac04ce167d1a0839a2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_dd117c1e05721953ae346a3106" ON "mcp_oauth_client_registrations" ("integration_id") WHERE "issuer" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_oauth_user_tokens" ADD CONSTRAINT "FK_08da25cec0bc41ed94b938822e3" FOREIGN KEY ("integration_id") REFERENCES "mcp_integrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_oauth_user_tokens" ADD CONSTRAINT "FK_a4e7d918c0c0d56eb99e577c701" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_oauth_pending_sessions" ADD CONSTRAINT "FK_b6b226d3b1a97c86cbc59aa731d" FOREIGN KEY ("integration_id") REFERENCES "mcp_integrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_oauth_pending_sessions" ADD CONSTRAINT "FK_88b6542caff918018c9f8200698" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_oauth_pending_sessions" ADD CONSTRAINT "FK_c170daa4fa79d7dd54fdb0523ea" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_oauth_client_registrations" ADD CONSTRAINT "FK_8d76f6e93344faa1187dc14a388" FOREIGN KEY ("integration_id") REFERENCES "mcp_integrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_oauth_client_registrations" DROP CONSTRAINT "FK_8d76f6e93344faa1187dc14a388"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_oauth_pending_sessions" DROP CONSTRAINT "FK_c170daa4fa79d7dd54fdb0523ea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_oauth_pending_sessions" DROP CONSTRAINT "FK_88b6542caff918018c9f8200698"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_oauth_pending_sessions" DROP CONSTRAINT "FK_b6b226d3b1a97c86cbc59aa731d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_oauth_user_tokens" DROP CONSTRAINT "FK_a4e7d918c0c0d56eb99e577c701"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_oauth_user_tokens" DROP CONSTRAINT "FK_08da25cec0bc41ed94b938822e3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dd117c1e05721953ae346a3106"`,
    );
    await queryRunner.query(`DROP TABLE "mcp_oauth_client_registrations"`);
    await queryRunner.query(`DROP TABLE "mcp_oauth_pending_sessions"`);
    await queryRunner.query(`DROP TABLE "mcp_oauth_user_tokens"`);
  }
}
