import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveSourceVectorsToIndex1754056995759
  implements MigrationInterface
{
  name = 'MoveSourceVectorsToIndex1754056995759';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "FK_bfd43366e5c7a4cb70b27e0d563"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bfd43366e5c7a4cb70b27e0d56"`,
    );
    await queryRunner.query(
      `CREATE TABLE "thread_source_assignments" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "threadId" character varying NOT NULL, "sourceId" character varying NOT NULL, CONSTRAINT "PK_86a5dc946bee26f1467f3592c07" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cdef2ead56c287ce5b45145809" ON "thread_source_assignments" ("threadId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b3f6ce0848f7ed98a4febe5656" ON "thread_source_assignments" ("sourceId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "child_chunks" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "parentId" character varying NOT NULL, "embedding" vector, CONSTRAINT "PK_27a954870301975c295a4d29dc2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "parent_chunks" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "relatedDocumentId" character varying NOT NULL, "relatedChunkId" character varying NOT NULL, "content" character varying NOT NULL, CONSTRAINT "PK_87ca243d2b717ba8ce411f64558" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "threadId"`);
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "userId"`);
    await queryRunner.query(
      `ALTER TABLE "source_contents" ADD "meta" jsonb NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_source_assignments" ADD CONSTRAINT "FK_cdef2ead56c287ce5b45145809e" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_source_assignments" ADD CONSTRAINT "FK_b3f6ce0848f7ed98a4febe56567" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "child_chunks" ADD CONSTRAINT "FK_288673ba3bd260f9a174c6bb75b" FOREIGN KEY ("parentId") REFERENCES "parent_chunks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "child_chunks" DROP CONSTRAINT "FK_288673ba3bd260f9a174c6bb75b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_source_assignments" DROP CONSTRAINT "FK_b3f6ce0848f7ed98a4febe56567"`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_source_assignments" DROP CONSTRAINT "FK_cdef2ead56c287ce5b45145809e"`,
    );
    await queryRunner.query(`ALTER TABLE "source_contents" DROP COLUMN "meta"`);
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "userId" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "threadId" character varying NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE "parent_chunks"`);
    await queryRunner.query(`DROP TABLE "child_chunks"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b3f6ce0848f7ed98a4febe5656"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cdef2ead56c287ce5b45145809"`,
    );
    await queryRunner.query(`DROP TABLE "thread_source_assignments"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_bfd43366e5c7a4cb70b27e0d56" ON "sources" ("threadId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "FK_bfd43366e5c7a4cb70b27e0d563" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
