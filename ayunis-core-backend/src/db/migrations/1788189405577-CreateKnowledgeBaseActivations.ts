import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKnowledgeBaseActivations1788189405577 implements MigrationInterface {
  name = 'CreateKnowledgeBaseActivations1788189405577';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "knowledge_base_activations" ("id" uuid NOT NULL, "knowledgeBaseId" character varying NOT NULL, "userId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0a3958c4d093b81e24bb0d5a71d" UNIQUE ("knowledgeBaseId", "userId"), CONSTRAINT "PK_bfb8c6580c92cc38b09d19f58ca" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_24ccd5ff78be47e2d204e180e9" ON "knowledge_base_activations" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cc15040a7ba74c2ac60a698df8" ON "shares" ("skill_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9d58e41ed733832c1feaf146a6" ON "shares" ("knowledge_base_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" ADD CONSTRAINT "FK_5eb6016818ad58ea8e9c23b4a18" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" ADD CONSTRAINT "FK_24ccd5ff78be47e2d204e180e9b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" DROP CONSTRAINT "FK_24ccd5ff78be47e2d204e180e9b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" DROP CONSTRAINT "FK_5eb6016818ad58ea8e9c23b4a18"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9d58e41ed733832c1feaf146a6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cc15040a7ba74c2ac60a698df8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_24ccd5ff78be47e2d204e180e9"`,
    );
    await queryRunner.query(`DROP TABLE "knowledge_base_activations"`);
  }
}
