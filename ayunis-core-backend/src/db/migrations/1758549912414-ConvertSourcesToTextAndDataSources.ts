import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertSourcesToTextAndDataSources1758549912414
  implements MigrationInterface
{
  name = 'ConvertSourcesToTextAndDataSources1758549912414';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP CONSTRAINT "FK_454f36c17f9a5c91ecb079852bb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP CONSTRAINT "FK_bd61e255ed429f6f327137c3f69"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_454f36c17f9a5c91ecb079852b"`,
    );
    await queryRunner.query(
      `CREATE TABLE "text_source_details_record" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "textType" character varying NOT NULL, "text" character varying NOT NULL, "fileType" character varying, "url" character varying, CONSTRAINT "PK_762ee909a991455dede5fa838a3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e2db10fcf79162c867e3ed44fa" ON "text_source_details_record" ("textType") `,
    );
    await queryRunner.query(
      `CREATE TABLE "file_source_details_record" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "textType" character varying NOT NULL, "text" character varying NOT NULL, "fileType" character varying, CONSTRAINT "PK_c8ab52870812cad5b9f587ecd99" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "url_source_details_record" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "textType" character varying NOT NULL, "text" character varying NOT NULL, "url" character varying, CONSTRAINT "PK_2b6861526eb4c58442700efee02" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "data_source_details_record" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "dataType" character varying NOT NULL, "data" character varying, "sourceId" character varying, CONSTRAINT "REL_a35327603d229c1407af193877" UNIQUE ("sourceId"), CONSTRAINT "PK_15047e1adac60edb7db31554a1a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8452e2f7d3dbb402ba384b6550" ON "data_source_details_record" ("dataType") `,
    );
    await queryRunner.query(
      `CREATE TABLE "csv_data_source_details_record" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "dataType" character varying NOT NULL, "data" character varying, "sourceId" character varying, CONSTRAINT "REL_02fe68a27e685f3c81af560e0f" UNIQUE ("sourceId"), CONSTRAINT "PK_e7e9e4ad0aba6ee1ab014d8306f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "text_source_record" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "type" character varying NOT NULL, "sourceId" character varying, CONSTRAINT "REL_38a2902e590d2ab0fdc3a07d0a" UNIQUE ("sourceId"), CONSTRAINT "PK_ab4c74f5b675e0b86f8a977bca7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "data_source_record" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "type" character varying NOT NULL, "sourceId" character varying, CONSTRAINT "REL_fc7334ce0ee4d9266aefb8b759" UNIQUE ("sourceId"), CONSTRAINT "PK_d1b21b3a80b1220485897474486" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP COLUMN "vector"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP COLUMN "embeddingDimension"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP COLUMN "sourceContentId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP COLUMN "chunkContent"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP COLUMN "embeddingModel"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP COLUMN "embeddingProvider"`,
    );
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "fileSize"`);
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "fileType"`);
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "url"`);
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "text"`);
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD "content" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD "meta" jsonb NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "sourceId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "UQ_b8571f7b820de796d0b0cef0e86" UNIQUE ("sourceId")`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."agent_tools_tooltype_enum" RENAME TO "agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_tools_tooltype_enum" AS ENUM('http', 'source_query', 'internet_search', 'website_content', 'send_email', 'create_calendar_event', 'code_execution')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a1a5256bddf01199ae45258945"`,
    );
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."sources_type_enum"`);
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "type" character varying NOT NULL DEFAULT 'text'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a1a5256bddf01199ae45258945" ON "sources" ("type") `,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD CONSTRAINT "FK_bd61e255ed429f6f327137c3f69" FOREIGN KEY ("sourceId") REFERENCES "text_source_details_record"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_details_record" ADD CONSTRAINT "FK_a35327603d229c1407af1938773" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "csv_data_source_details_record" ADD CONSTRAINT "FK_02fe68a27e685f3c81af560e0f1" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "FK_b8571f7b820de796d0b0cef0e86" FOREIGN KEY ("sourceId") REFERENCES "text_source_details_record"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "text_source_record" ADD CONSTRAINT "FK_38a2902e590d2ab0fdc3a07d0a3" FOREIGN KEY ("sourceId") REFERENCES "text_source_details_record"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_record" ADD CONSTRAINT "FK_fc7334ce0ee4d9266aefb8b7590" FOREIGN KEY ("sourceId") REFERENCES "data_source_details_record"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "data_source_record" DROP CONSTRAINT "FK_fc7334ce0ee4d9266aefb8b7590"`,
    );
    await queryRunner.query(
      `ALTER TABLE "text_source_record" DROP CONSTRAINT "FK_38a2902e590d2ab0fdc3a07d0a3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "FK_b8571f7b820de796d0b0cef0e86"`,
    );
    await queryRunner.query(
      `ALTER TABLE "csv_data_source_details_record" DROP CONSTRAINT "FK_02fe68a27e685f3c81af560e0f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "data_source_details_record" DROP CONSTRAINT "FK_a35327603d229c1407af1938773"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP CONSTRAINT "FK_bd61e255ed429f6f327137c3f69"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a1a5256bddf01199ae45258945"`,
    );
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "type"`);
    await queryRunner.query(
      `CREATE TYPE "public"."sources_type_enum" AS ENUM('file', 'url')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "type" "public"."sources_type_enum" NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a1a5256bddf01199ae45258945" ON "sources" ("type") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_tools_tooltype_enum_old" AS ENUM('http', 'source_query', 'internet_search', 'website_content', 'send_email', 'create_calendar_event')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum_old" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."agent_tools_tooltype_enum_old" RENAME TO "agent_tools_tooltype_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "UQ_b8571f7b820de796d0b0cef0e86"`,
    );
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "sourceId"`);
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP COLUMN "meta"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP COLUMN "content"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "text" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "fileType" character varying`,
    );
    await queryRunner.query(`ALTER TABLE "sources" ADD "fileSize" integer`);
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD "embeddingProvider" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD "embeddingModel" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD "chunkContent" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD "sourceContentId" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD "embeddingDimension" integer NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD "vector" vector`,
    );
    await queryRunner.query(`DROP TABLE "data_source_record"`);
    await queryRunner.query(`DROP TABLE "text_source_record"`);
    await queryRunner.query(`DROP TABLE "csv_data_source_details_record"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8452e2f7d3dbb402ba384b6550"`,
    );
    await queryRunner.query(`DROP TABLE "data_source_details_record"`);
    await queryRunner.query(`DROP TABLE "url_source_details_record"`);
    await queryRunner.query(`DROP TABLE "file_source_details_record"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e2db10fcf79162c867e3ed44fa"`,
    );
    await queryRunner.query(`DROP TABLE "text_source_details_record"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_454f36c17f9a5c91ecb079852b" ON "source_content_chunks" ("sourceContentId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD CONSTRAINT "FK_bd61e255ed429f6f327137c3f69" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD CONSTRAINT "FK_454f36c17f9a5c91ecb079852bb" FOREIGN KEY ("sourceContentId") REFERENCES "source_contents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
