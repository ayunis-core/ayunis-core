import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSsoPersistenceTables1786025423458 implements MigrationInterface {
  name = 'CreateSsoPersistenceTables1786025423458';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."org_sso_connections_status_enum" AS ENUM('draft', 'customer_setup', 'testing', 'pending_review', 'changes_requested', 'active')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."org_sso_connections_provisioningmode_enum" AS ENUM('invite_only', 'jit')`,
    );
    await queryRunner.query(
      `CREATE TABLE "org_sso_connections" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "emailDomain" character varying(253) NOT NULL, "verifiedEmailDomain" character varying(253), "domainVerifiedAt" TIMESTAMP WITH TIME ZONE, "brokerOrgId" character varying(255), "status" "public"."org_sso_connections_status_enum" NOT NULL DEFAULT 'draft', "enabled" boolean NOT NULL DEFAULT false, "provisioningMode" "public"."org_sso_connections_provisioningmode_enum" NOT NULL DEFAULT 'invite_only', CONSTRAINT "UQ_124c0b62e214ef640ae804e6f6d" UNIQUE ("brokerOrgId"), CONSTRAINT "UQ_892d6c77c321098a75cb1d257f2" UNIQUE ("verifiedEmailDomain"), CONSTRAINT "REL_62c35b470ecd255934b5d600f2" UNIQUE ("orgId"), CONSTRAINT "CHK_8a1fe0e91b0ee29eb71ce68728" CHECK (NOT "enabled" OR ("status" = 'active' AND "brokerOrgId" IS NOT NULL)), CONSTRAINT "CHK_0a33e61b261b03afa05d97c641" CHECK ("status" <> 'active' OR ("verifiedEmailDomain" IS NOT NULL AND "verifiedEmailDomain" = "emailDomain")), CONSTRAINT "CHK_73510f7083d26df238a0774013" CHECK ("brokerOrgId" IS NULL OR ("brokerOrgId" <> '' AND "brokerOrgId" = btrim("brokerOrgId"))), CONSTRAINT "CHK_3a46fb0e2b205936eeb7d6ca68" CHECK (("verifiedEmailDomain" IS NULL) = ("domainVerifiedAt" IS NULL)), CONSTRAINT "CHK_75b4ad2bf551b4abca6022ee33" CHECK ("verifiedEmailDomain" IS NULL OR "verifiedEmailDomain" ~ '^([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9])([.]([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9]))+$'), CONSTRAINT "CHK_032be43c71b611e4a7b916c778" CHECK ("verifiedEmailDomain" IS NULL OR "verifiedEmailDomain" = lower(btrim("verifiedEmailDomain"))), CONSTRAINT "CHK_3feae2d6977f38df9dba7d40d9" CHECK ("emailDomain" ~ '^([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9])([.]([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9]))+$'), CONSTRAINT "CHK_a9d6795bc6310fd249315648eb" CHECK ("emailDomain" = lower(btrim("emailDomain"))), CONSTRAINT "PK_99059cd7cff9f1895de54a08804" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "federated_identities" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "issuer" text NOT NULL, "subject" character varying(255) NOT NULL, "userId" character varying NOT NULL, CONSTRAINT "UQ_c9ea7918683e4d47f6e16d5fd33" UNIQUE ("issuer", "subject"), CONSTRAINT "PK_3e5b63cd07d7a2251e0131834a3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ed23d05acbc826a270bb135f0a" ON "federated_identities" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "org_sso_connections" ADD CONSTRAINT "FK_62c35b470ecd255934b5d600f27" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "federated_identities" ADD CONSTRAINT "FK_ed23d05acbc826a270bb135f0a5" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "federated_identities" DROP CONSTRAINT "FK_ed23d05acbc826a270bb135f0a5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_sso_connections" DROP CONSTRAINT "FK_62c35b470ecd255934b5d600f27"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ed23d05acbc826a270bb135f0a"`,
    );
    await queryRunner.query(`DROP TABLE "federated_identities"`);
    await queryRunner.query(`DROP TABLE "org_sso_connections"`);
    await queryRunner.query(
      `DROP TYPE "public"."org_sso_connections_provisioningmode_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."org_sso_connections_status_enum"`,
    );
  }
}
