import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsAndThreadSourceNotification1794028594897 implements MigrationInterface {
  name = 'CreateNotificationsAndThreadSourceNotification1794028594897';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('routine', 'routine_error')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "orgId" character varying NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "headline" character varying(200) NOT NULL, "subheadline" character varying(300) NOT NULL, "body" text NOT NULL, "routineId" character varying, "routineThreadId" character varying, "readAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2eab837902a4a324a1ddfa6881" ON "notifications" ("routineId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_112a0edd2d702e2ab47d70ce41" ON "notifications" ("routineThreadId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2e5d535f09297e91a2902faaf3" ON "notifications" ("orgId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_21e65af2f4f242d4c85a92aff4" ON "notifications" ("userId", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "sourceNotificationId" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c6d1f8058491d968f0a7794afe" ON "threads" ("sourceNotificationId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "FK_c6d1f8058491d968f0a7794afed" FOREIGN KEY ("sourceNotificationId") REFERENCES "notifications"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_ac41284f99d958df36531fd0203" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_2eab837902a4a324a1ddfa68811" FOREIGN KEY ("routineId") REFERENCES "routines"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_112a0edd2d702e2ab47d70ce41c" FOREIGN KEY ("routineThreadId") REFERENCES "threads"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_112a0edd2d702e2ab47d70ce41c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_2eab837902a4a324a1ddfa68811"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_ac41284f99d958df36531fd0203"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "FK_c6d1f8058491d968f0a7794afed"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c6d1f8058491d968f0a7794afe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP COLUMN "sourceNotificationId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_21e65af2f4f242d4c85a92aff4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2e5d535f09297e91a2902faaf3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_112a0edd2d702e2ab47d70ce41"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2eab837902a4a324a1ddfa6881"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
  }
}
