import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePersonalCreditReservations1789646816660 implements MigrationInterface {
  name = 'CreatePersonalCreditReservations1789646816660';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "personal_credit_reservations" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "userId" character varying NOT NULL, "credits" numeric(16,6) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_365aba6edb31a01ded61790a454" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_793344a31c54269781e67b4e4c" ON "personal_credit_reservations" ("orgId", "userId", "expiresAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "personal_credit_reservations" ADD CONSTRAINT "FK_f755d09c0e1f09aca7f44c11da8" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "personal_credit_reservations" ADD CONSTRAINT "FK_57551aca3f864ca1c21b3ed8f0a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "personal_credit_reservations" DROP CONSTRAINT "FK_57551aca3f864ca1c21b3ed8f0a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "personal_credit_reservations" DROP CONSTRAINT "FK_f755d09c0e1f09aca7f44c11da8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_793344a31c54269781e67b4e4c"`,
    );
    await queryRunner.query(`DROP TABLE "personal_credit_reservations"`);
  }
}
