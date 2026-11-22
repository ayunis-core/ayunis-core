import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConnectorsTable1795005404296 implements MigrationInterface {
  name = 'CreateConnectorsTable1795005404296';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."connectors_product_enum" AS ENUM('microsoft_365')`,
    );
    await queryRunner.query(
      `CREATE TABLE "connectors" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "product" "public"."connectors_product_enum" NOT NULL, "setup" jsonb NOT NULL DEFAULT '{}', "encryptedCredentials" text, CONSTRAINT "UQ_c722cc1c4bf7752a27ad3d74e99" UNIQUE ("orgId", "product"), CONSTRAINT "PK_c1334e2a68a8de86d1732a8e3fb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "connectors" ADD CONSTRAINT "FK_0f31c8ac1eda22e222c36b8ea43" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "connectors" DROP CONSTRAINT "FK_0f31c8ac1eda22e222c36b8ea43"`,
    );
    await queryRunner.query(`DROP TABLE "connectors"`);
    await queryRunner.query(`DROP TYPE "public"."connectors_product_enum"`);
  }
}
