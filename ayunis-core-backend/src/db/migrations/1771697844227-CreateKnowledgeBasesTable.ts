import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKnowledgeBasesTable1771697844227
  implements MigrationInterface
{
  name = 'CreateKnowledgeBasesTable1771697844227';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "knowledge_bases" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(255) NOT NULL, "description" text NOT NULL DEFAULT '', "orgId" character varying NOT NULL, "userId" character varying NOT NULL, CONSTRAINT "PK_b7da0ee578e15ebb6213465440d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "knowledgeBaseId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "FK_16ddae600230efe98552376f4c7" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "FK_16ddae600230efe98552376f4c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" DROP COLUMN "knowledgeBaseId"`,
    );
    await queryRunner.query(`DROP TABLE "knowledge_bases"`);
  }
}
