import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecordingSummaryModelsTable1794446510873 implements MigrationInterface {
  name = 'CreateRecordingSummaryModelsTable1794446510873';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "recording_summary_models" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "permittedModelId" character varying NOT NULL, CONSTRAINT "PK_160c4c587f20f200ed24e7190e1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_42e62dec9ee054a27dc7f49b65" ON "recording_summary_models" ("permittedModelId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_30af2a0fc165cffa6de828ba7f" ON "recording_summary_models" ("orgId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "recording_summary_models" ADD CONSTRAINT "FK_30af2a0fc165cffa6de828ba7fe" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recording_summary_models" ADD CONSTRAINT "FK_42e62dec9ee054a27dc7f49b65b" FOREIGN KEY ("permittedModelId") REFERENCES "permitted_models"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recording_summary_models" DROP CONSTRAINT "FK_42e62dec9ee054a27dc7f49b65b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recording_summary_models" DROP CONSTRAINT "FK_30af2a0fc165cffa6de828ba7fe"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_30af2a0fc165cffa6de828ba7f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_42e62dec9ee054a27dc7f49b65"`,
    );
    await queryRunner.query(`DROP TABLE "recording_summary_models"`);
  }
}
