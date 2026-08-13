import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSsoPersistenceTables1786452570864 implements MigrationInterface {
  name = 'CreateSsoPersistenceTables1786452570864';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "org_sso_connections" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "emailDomain" character varying(253) NOT NULL, "domainVerifiedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "zitadelOrgId" character varying(255), "enabled" boolean NOT NULL DEFAULT false, "jitProvisioningEnabled" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_4f11a98a3183992bf0ac0090ac2" UNIQUE ("zitadelOrgId"), CONSTRAINT "UQ_f77aa036bc1422c9ce84a9a13ac" UNIQUE ("emailDomain"), CONSTRAINT "REL_62c35b470ecd255934b5d600f2" UNIQUE ("orgId"), CONSTRAINT "CHK_1ba5659d1b01dc71cde8266dae" CHECK (NOT "enabled" OR "zitadelOrgId" IS NOT NULL), CONSTRAINT "CHK_c34e321de4a0d740abdc1be8aa" CHECK ("zitadelOrgId" IS NULL OR ("zitadelOrgId" <> '' AND "zitadelOrgId" = btrim("zitadelOrgId"))), CONSTRAINT "CHK_3feae2d6977f38df9dba7d40d9" CHECK ("emailDomain" ~ '^([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9])([.]([a-z0-9]|[a-z0-9][a-z0-9-]{0,61}[a-z0-9]))+$'), CONSTRAINT "CHK_a9d6795bc6310fd249315648eb" CHECK ("emailDomain" = lower(btrim("emailDomain"))), CONSTRAINT "PK_99059cd7cff9f1895de54a08804" PRIMARY KEY ("id"))`,
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
  }
}
