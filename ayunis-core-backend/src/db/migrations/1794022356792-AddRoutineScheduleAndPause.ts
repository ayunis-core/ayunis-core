import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoutineScheduleAndPause1794022356792 implements MigrationInterface {
  name = 'AddRoutineScheduleAndPause1794022356792';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "routines" ADD "nextRunAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ADD "lastRunStartedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ADD "recentExecutionKeys" character varying(100) array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ADD "pausedAt" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_49703df1f4a7127bc045f44c4c" ON "routines" ("nextRunAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f03becaa532f285b609afea51f" ON "routines" ("lastRunStartedAt") WHERE "lastRunStatus" = 'running'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f03becaa532f285b609afea51f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_49703df1f4a7127bc045f44c4c"`,
    );
    await queryRunner.query(`ALTER TABLE "routines" DROP COLUMN "pausedAt"`);
    await queryRunner.query(
      `ALTER TABLE "routines" DROP COLUMN "recentExecutionKeys"`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" DROP COLUMN "lastRunStartedAt"`,
    );
    await queryRunner.query(`ALTER TABLE "routines" DROP COLUMN "nextRunAt"`);
  }
}
