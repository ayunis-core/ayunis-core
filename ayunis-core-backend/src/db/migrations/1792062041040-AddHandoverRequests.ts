import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHandoverRequests1792062041040 implements MigrationInterface {
  name = 'AddHandoverRequests1792062041040';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."handover_requests_resourcetype_enum" AS ENUM('skill', 'knowledge_base')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."handover_requests_targettype_enum" AS ENUM('team', 'org')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."handover_requests_status_enum" AS ENUM('pending', 'approved', 'rejected', 'withdrawn')`,
    );
    await queryRunner.query(
      `CREATE TABLE "handover_requests" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "resourceType" "public"."handover_requests_resourcetype_enum" NOT NULL, "skillId" character varying, "knowledgeBaseId" character varying, "targetType" "public"."handover_requests_targettype_enum" NOT NULL, "targetTeamId" character varying, "requestedByUserId" character varying NOT NULL, "status" "public"."handover_requests_status_enum" NOT NULL DEFAULT 'pending', "decidedAt" TIMESTAMP, "decidedByUserId" character varying, CONSTRAINT "CHK_handover_requests_target" CHECK (("targetType" = 'team') = ("targetTeamId" IS NOT NULL)), CONSTRAINT "CHK_handover_requests_resource" CHECK (("resourceType" = 'skill' AND "skillId" IS NOT NULL AND "knowledgeBaseId" IS NULL) OR ("resourceType" = 'knowledge_base' AND "knowledgeBaseId" IS NOT NULL AND "skillId" IS NULL)), CONSTRAINT "PK_1716fdc67f927eb3abfffc3b978" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1a5d769b2df3e70a09a8288205" ON "handover_requests" ("orgId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8134a3d21dd0ad43028a24efdb" ON "handover_requests" ("requestedByUserId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_handover_requests_pending_knowledge_base" ON "handover_requests" ("knowledgeBaseId") WHERE "status" = 'pending' AND "knowledgeBaseId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_handover_requests_pending_skill" ON "handover_requests" ("skillId") WHERE "status" = 'pending' AND "skillId" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD "submittedByUserId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "submittedByUserId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD CONSTRAINT "FK_fabb697dddc87ebf639b85cbae1" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "FK_6c9f67f82738a431410f1a7d5d9" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "handover_requests" ADD CONSTRAINT "FK_1a5d769b2df3e70a09a82882050" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "handover_requests" ADD CONSTRAINT "FK_a43e9e79c423c0904a20ad739ed" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "handover_requests" ADD CONSTRAINT "FK_a063ad0021e87b2502d2fdac49a" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "handover_requests" ADD CONSTRAINT "FK_8ce549321292f4e724e169eb03c" FOREIGN KEY ("targetTeamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "handover_requests" ADD CONSTRAINT "FK_8134a3d21dd0ad43028a24efdb3" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "handover_requests" ADD CONSTRAINT "FK_20832436541b150d6b7eb1f9ed7" FOREIGN KEY ("decidedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "handover_requests" DROP CONSTRAINT "FK_20832436541b150d6b7eb1f9ed7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "handover_requests" DROP CONSTRAINT "FK_8134a3d21dd0ad43028a24efdb3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "handover_requests" DROP CONSTRAINT "FK_8ce549321292f4e724e169eb03c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "handover_requests" DROP CONSTRAINT "FK_a063ad0021e87b2502d2fdac49a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "handover_requests" DROP CONSTRAINT "FK_a43e9e79c423c0904a20ad739ed"`,
    );
    await queryRunner.query(
      `ALTER TABLE "handover_requests" DROP CONSTRAINT "FK_1a5d769b2df3e70a09a82882050"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "FK_6c9f67f82738a431410f1a7d5d9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP CONSTRAINT "FK_fabb697dddc87ebf639b85cbae1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP COLUMN "submittedByUserId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP COLUMN "submittedByUserId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_handover_requests_pending_skill"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_handover_requests_pending_knowledge_base"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8134a3d21dd0ad43028a24efdb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1a5d769b2df3e70a09a8288205"`,
    );
    await queryRunner.query(`DROP TABLE "handover_requests"`);
    await queryRunner.query(
      `DROP TYPE "public"."handover_requests_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."handover_requests_targettype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."handover_requests_resourcetype_enum"`,
    );
  }
}
