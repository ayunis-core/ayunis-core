import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoutinesAndThreadRoutineOrigin1794007207365 implements MigrationInterface {
  name = 'CreateRoutinesAndThreadRoutineOrigin1794007207365';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."routines_lastrunstatus_enum" AS ENUM('queued', 'running', 'succeeded', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "routines" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "prompt" character varying(10000) NOT NULL, "userId" character varying NOT NULL, "orgId" character varying NOT NULL, "modelId" character varying, "dailyTime" character varying(5) NOT NULL, "internetEnabled" boolean NOT NULL DEFAULT false, "enabled" boolean NOT NULL DEFAULT true, "lastRunStatus" "public"."routines_lastrunstatus_enum", "lastRunAt" TIMESTAMP, "lastRunFailureReason" character varying(100), "consecutiveFailureCount" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_6847e8f0f74e65a6f10409dee9f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ae06dff0a9aad63673a8b48d0" ON "routines" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2a06b68712b2183639fdf55c5c" ON "routines" ("orgId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ee0186c8a5603beb3bfcceefe5" ON "routines" ("modelId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."threads_type_enum" AS ENUM('chat', 'routine')`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "type" "public"."threads_type_enum" NOT NULL DEFAULT 'chat'`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "routineId" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a481c5d934ecfb1f229b2665e" ON "threads" ("routineId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ADD CONSTRAINT "FK_6ae06dff0a9aad63673a8b48d0a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ADD CONSTRAINT "FK_2a06b68712b2183639fdf55c5c8" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ADD CONSTRAINT "FK_ee0186c8a5603beb3bfcceefe50" FOREIGN KEY ("modelId") REFERENCES "permitted_models"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "FK_9a481c5d934ecfb1f229b2665e8" FOREIGN KEY ("routineId") REFERENCES "routines"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "FK_9a481c5d934ecfb1f229b2665e8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" DROP CONSTRAINT "FK_ee0186c8a5603beb3bfcceefe50"`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" DROP CONSTRAINT "FK_2a06b68712b2183639fdf55c5c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" DROP CONSTRAINT "FK_6ae06dff0a9aad63673a8b48d0a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9a481c5d934ecfb1f229b2665e"`,
    );
    await queryRunner.query(`ALTER TABLE "threads" DROP COLUMN "routineId"`);
    await queryRunner.query(`ALTER TABLE "threads" DROP COLUMN "type"`);
    await queryRunner.query(`DROP TYPE "public"."threads_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ee0186c8a5603beb3bfcceefe5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2a06b68712b2183639fdf55c5c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6ae06dff0a9aad63673a8b48d0"`,
    );
    await queryRunner.query(`DROP TABLE "routines"`);
    await queryRunner.query(`DROP TYPE "public"."routines_lastrunstatus_enum"`);
  }
}
