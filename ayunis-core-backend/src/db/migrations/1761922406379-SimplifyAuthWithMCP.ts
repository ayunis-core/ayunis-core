import { MigrationInterface, QueryRunner } from 'typeorm';

export class SimplifyAuthWithMCP1761922406379 implements MigrationInterface {
  name = 'SimplifyAuthWithMCP1761922406379';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP CONSTRAINT "FK_361519bc4014d1026acdeb2ee30"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_mcp_integrations_org"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c8eddaecc592cea7617957baa0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP CONSTRAINT "UQ_ee23422cf88c2c69cf19e1878d6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" RENAME COLUMN "createdByLLM" TO "createdBy"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "auth_method"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "encrypted_credentials"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "organization_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "slug"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "org_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "predefined_slug" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "connection_status" character varying NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "last_connection_error" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "last_connection_check" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "oauth_client_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "oauth_client_secret" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "oauth_access_token" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "oauth_refresh_token" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "oauth_token_expires_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "api_key" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "api_key_header_name" character varying DEFAULT 'X-API-Key'`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "auth_token" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "auth_type" character varying NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "createdBy"`);
    await queryRunner.query(
      `CREATE TYPE "public"."sources_createdby_enum" AS ENUM('user', 'llm', 'system')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "createdBy" "public"."sources_createdby_enum" NOT NULL DEFAULT 'user'`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "name" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "server_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "server_url" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "auth_header_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "auth_header_name" character varying DEFAULT 'Authorization'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_0d24a2b75193bc0ed477daf71d" ON "mcp_integrations" ("org_id", "predefined_slug") WHERE predefined_slug IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_204cb83c8915b9e348802cb131" ON "mcp_integrations" ("auth_type") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_204cb83c8915b9e348802cb131"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0d24a2b75193bc0ed477daf71d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "auth_header_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "auth_header_name" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "server_url"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "server_url" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "name" character varying(255) NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "createdBy"`);
    await queryRunner.query(`DROP TYPE "public"."sources_createdby_enum"`);
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "createdBy" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "auth_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "auth_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "api_key_header_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "api_key"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "oauth_token_expires_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "oauth_refresh_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "oauth_access_token"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "oauth_client_secret"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "oauth_client_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "last_connection_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "last_connection_error"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "connection_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "predefined_slug"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "org_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "organizationId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "type" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "slug" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "organization_id" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "encrypted_credentials" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "auth_method" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" RENAME COLUMN "createdBy" TO "createdByLLM"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD CONSTRAINT "UQ_ee23422cf88c2c69cf19e1878d6" UNIQUE ("name", "organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c8eddaecc592cea7617957baa0" ON "mcp_integrations" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_mcp_integrations_org" ON "mcp_integrations" ("organization_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD CONSTRAINT "FK_361519bc4014d1026acdeb2ee30" FOREIGN KEY ("organizationId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
