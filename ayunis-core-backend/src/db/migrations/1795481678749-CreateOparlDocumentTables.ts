import type { MigrationInterface, QueryRunner } from 'typeorm';

const EMBEDDING_DIMENSIONS = [1024, 1536, 2560];

export class CreateOparlDocumentTables1795481678749 implements MigrationInterface {
  name = 'CreateOparlDocumentTables1795481678749';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."oparl_file_texts_status_enum" AS ENUM('extracted', 'skipped', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."oparl_file_texts_skipreason_enum" AS ENUM('too_large', 'too_many_pages', 'unsupported_type', 'unreadable')`,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_file_texts" ("fileId" character varying NOT NULL, "status" "public"."oparl_file_texts_status_enum" NOT NULL, "skipReason" "public"."oparl_file_texts_skipreason_enum", "error" text, "contentHash" text, "pageCount" integer, "pages" jsonb, "chunkCount" integer NOT NULL DEFAULT '0', "sourceFingerprint" text NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "readAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_08f5e497d3670f15a1fbdc3c206" PRIMARY KEY ("fileId"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."oparl_chunks_source_enum" AS ENUM('paper', 'meeting', 'agenda_item', 'file')`,
    );
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (current_database(), $1, $2, $3, $4, $5)`,
      [
        'public',
        'oparl_chunks',
        'GENERATED_COLUMN',
        'searchVector',
        'to_tsvector(\'german\', "text")',
      ],
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_chunks" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "bodyId" character varying NOT NULL, "source" "public"."oparl_chunks_source_enum" NOT NULL, "paperId" character varying, "meetingId" character varying, "agendaItemId" character varying, "fileId" character varying, "date" date, "pageNumber" integer, "ordinal" integer NOT NULL, "text" text NOT NULL, "sourceHash" text, "searchVector" tsvector GENERATED ALWAYS AS (to_tsvector('german', "text")) STORED NOT NULL, "embeddingModelId" character varying, "embedding1024" halfvec(1024), "embedding1536" halfvec(1536), "embedding2560" halfvec(2560), CONSTRAINT "PK_8c01a3d0b95ce7efc91bd1fdda8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5245dbe376f77729f5be840186" ON "oparl_chunks" ("paperId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6eeaf565d275d79cfc5807208a" ON "oparl_chunks" ("meetingId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6d9c07c253f75f1425b9163494" ON "oparl_chunks" ("agendaItemId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_12359199cdb0577aace2515da2" ON "oparl_chunks" ("fileId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9d8838d0c31630950bff2dcf8b" ON "oparl_chunks" ("bodyId", "id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_oparl_chunks_search_vector" ON "oparl_chunks" USING gin ("searchVector")`,
    );
    for (const dimensions of EMBEDDING_DIMENSIONS) {
      const column = `embedding${dimensions}`;
      await queryRunner.query(
        `CREATE INDEX "IDX_oparl_chunks_${column}_hnsw" ON "oparl_chunks" USING hnsw ("${column}" halfvec_cosine_ops) WHERE "${column}" IS NOT NULL`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "oparl_file_texts" ADD CONSTRAINT "FK_08f5e497d3670f15a1fbdc3c206" FOREIGN KEY ("fileId") REFERENCES "oparl_files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_chunks" ADD CONSTRAINT "FK_a1d635cc886bbb1255d54c15de1" FOREIGN KEY ("bodyId") REFERENCES "oparl_bodies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_chunks" ADD CONSTRAINT "FK_5245dbe376f77729f5be840186f" FOREIGN KEY ("paperId") REFERENCES "oparl_papers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_chunks" ADD CONSTRAINT "FK_6eeaf565d275d79cfc5807208ad" FOREIGN KEY ("meetingId") REFERENCES "oparl_meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_chunks" ADD CONSTRAINT "FK_6d9c07c253f75f1425b91634944" FOREIGN KEY ("agendaItemId") REFERENCES "oparl_agenda_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_chunks" ADD CONSTRAINT "FK_12359199cdb0577aace2515da2e" FOREIGN KEY ("fileId") REFERENCES "oparl_files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_chunks" ADD CONSTRAINT "FK_07341f98750554549df4866aeec" FOREIGN KEY ("embeddingModelId") REFERENCES "models"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "oparl_chunks" DROP CONSTRAINT "FK_07341f98750554549df4866aeec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_chunks" DROP CONSTRAINT "FK_12359199cdb0577aace2515da2e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_chunks" DROP CONSTRAINT "FK_6d9c07c253f75f1425b91634944"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_chunks" DROP CONSTRAINT "FK_6eeaf565d275d79cfc5807208ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_chunks" DROP CONSTRAINT "FK_5245dbe376f77729f5be840186f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_chunks" DROP CONSTRAINT "FK_a1d635cc886bbb1255d54c15de1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_file_texts" DROP CONSTRAINT "FK_08f5e497d3670f15a1fbdc3c206"`,
    );
    for (const dimensions of EMBEDDING_DIMENSIONS) {
      await queryRunner.query(
        `DROP INDEX "public"."IDX_oparl_chunks_embedding${dimensions}_hnsw"`,
      );
    }
    await queryRunner.query(
      `DROP INDEX "public"."IDX_oparl_chunks_search_vector"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9d8838d0c31630950bff2dcf8b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_12359199cdb0577aace2515da2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6d9c07c253f75f1425b9163494"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6eeaf565d275d79cfc5807208a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5245dbe376f77729f5be840186"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_chunks"`);
    await queryRunner.query(
      `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "database" = current_database() AND "schema" = $3 AND "table" = $4`,
      ['GENERATED_COLUMN', 'searchVector', 'public', 'oparl_chunks'],
    );
    await queryRunner.query(`DROP TYPE "public"."oparl_chunks_source_enum"`);
    await queryRunner.query(`DROP TABLE "oparl_file_texts"`);
    await queryRunner.query(
      `DROP TYPE "public"."oparl_file_texts_skipreason_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."oparl_file_texts_status_enum"`,
    );
  }
}
