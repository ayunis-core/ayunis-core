import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateThreadKnowledgeBasesJoinTable1771705515228
  implements MigrationInterface
{
  name = 'CreateThreadKnowledgeBasesJoinTable1771705515228';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "thread_knowledge_bases" ("threadsId" character varying NOT NULL, "knowledgeBasesId" character varying NOT NULL, CONSTRAINT "PK_d78c7599d3be8ea97439650da69" PRIMARY KEY ("threadsId", "knowledgeBasesId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_13a1a6d203e60947a65a707c05" ON "thread_knowledge_bases" ("threadsId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8dc817a66dcc440419fdee6ca2" ON "thread_knowledge_bases" ("knowledgeBasesId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_knowledge_bases" ADD CONSTRAINT "FK_13a1a6d203e60947a65a707c052" FOREIGN KEY ("threadsId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_knowledge_bases" ADD CONSTRAINT "FK_8dc817a66dcc440419fdee6ca22" FOREIGN KEY ("knowledgeBasesId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "thread_knowledge_bases" DROP CONSTRAINT "FK_8dc817a66dcc440419fdee6ca22"`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_knowledge_bases" DROP CONSTRAINT "FK_13a1a6d203e60947a65a707c052"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8dc817a66dcc440419fdee6ca2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_13a1a6d203e60947a65a707c05"`,
    );
    await queryRunner.query(`DROP TABLE "thread_knowledge_bases"`);
  }
}
