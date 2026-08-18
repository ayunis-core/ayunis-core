import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateArtifactEmailDeliveries1787049056336 implements MigrationInterface {
  name = 'CreateArtifactEmailDeliveries1787049056336';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "artifact_email_deliveries" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "artifactId" character varying NOT NULL, "versionNumber" integer NOT NULL, "status" character varying NOT NULL, "errorMessage" text, "sentAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_artifact_email_delivery_version" UNIQUE ("artifactId", "versionNumber"), CONSTRAINT "PK_fbe4c8b01b1a5306188ddb3a2aa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b9f523d01daba2bfdd750abb93" ON "artifact_email_deliveries" ("artifactId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "artifact_email_deliveries" ADD CONSTRAINT "FK_b9f523d01daba2bfdd750abb93d" FOREIGN KEY ("artifactId") REFERENCES "artifacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "artifact_email_deliveries" DROP CONSTRAINT "FK_b9f523d01daba2bfdd750abb93d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b9f523d01daba2bfdd750abb93"`,
    );
    await queryRunner.query(`DROP TABLE "artifact_email_deliveries"`);
  }
}
