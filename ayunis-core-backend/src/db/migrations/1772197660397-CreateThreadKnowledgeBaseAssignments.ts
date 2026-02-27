import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateThreadKnowledgeBaseAssignments1772197660397
  implements MigrationInterface
{
  name = 'CreateThreadKnowledgeBaseAssignments1772197660397';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "thread_knowledge_base_assignments" (
        "id" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "threadId" character varying NOT NULL,
        "knowledgeBaseId" character varying NOT NULL,
        "originSkillId" uuid,
        CONSTRAINT "PK_29730caa763bf0e1413e9f87538" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d835f5fd7b2f9e332cddcf8909" ON "thread_knowledge_base_assignments" ("threadId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_19c8f433e210393b5793b8ade7" ON "thread_knowledge_base_assignments" ("knowledgeBaseId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5684625fb82bb130a0b1215733" ON "thread_knowledge_base_assignments" ("originSkillId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_knowledge_base_assignments" ADD CONSTRAINT "FK_d835f5fd7b2f9e332cddcf89096" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_knowledge_base_assignments" ADD CONSTRAINT "FK_19c8f433e210393b5793b8ade73" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Migrate existing data from join table
    await queryRunner.query(
      `INSERT INTO "thread_knowledge_base_assignments" ("id", "threadId", "knowledgeBaseId", "originSkillId", "createdAt", "updatedAt")
       SELECT gen_random_uuid()::varchar, "threadsId", "knowledgeBasesId", NULL, NOW(), NOW()
       FROM "thread_knowledge_bases"`,
    );

    // Drop old join table
    await queryRunner.query(`DROP TABLE "thread_knowledge_bases"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate old join table
    await queryRunner.query(
      `CREATE TABLE "thread_knowledge_bases" (
        "threadsId" character varying NOT NULL,
        "knowledgeBasesId" character varying NOT NULL,
        CONSTRAINT "PK_thread_knowledge_bases" PRIMARY KEY ("threadsId", "knowledgeBasesId")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_thread_knowledge_bases_threadsId" ON "thread_knowledge_bases" ("threadsId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_thread_knowledge_bases_knowledgeBasesId" ON "thread_knowledge_bases" ("knowledgeBasesId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_knowledge_bases" ADD CONSTRAINT "FK_13a1a6d203e60947a65a707c052" FOREIGN KEY ("threadsId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_knowledge_bases" ADD CONSTRAINT "FK_8dc817a66dcc440419fdee6ca22" FOREIGN KEY ("knowledgeBasesId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );

    // Migrate data back (lose originSkillId)
    await queryRunner.query(
      `INSERT INTO "thread_knowledge_bases" ("threadsId", "knowledgeBasesId")
       SELECT DISTINCT "threadId", "knowledgeBaseId"
       FROM "thread_knowledge_base_assignments"`,
    );

    // Drop new table
    await queryRunner.query(
      `ALTER TABLE "thread_knowledge_base_assignments" DROP CONSTRAINT "FK_19c8f433e210393b5793b8ade73"`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_knowledge_base_assignments" DROP CONSTRAINT "FK_d835f5fd7b2f9e332cddcf89096"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5684625fb82bb130a0b1215733"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_19c8f433e210393b5793b8ade7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d835f5fd7b2f9e332cddcf8909"`,
    );
    await queryRunner.query(
      `DROP TABLE "thread_knowledge_base_assignments"`,
    );
  }
}
