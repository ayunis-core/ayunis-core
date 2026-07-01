import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAcademyQuizQuestions1782913003187 implements MigrationInterface {
  name = 'AddAcademyQuizQuestions1782913003187';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "academy_quiz_questions" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "chapterId" character varying NOT NULL, "text" text NOT NULL, "options" jsonb NOT NULL, "position" integer NOT NULL, CONSTRAINT "PK_2351acb2a20e16b6d87f986d25c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_37ef5879e7742e11cd9bfbcb5f" ON "academy_quiz_questions" ("chapterId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapters" ADD "quizEnabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_quiz_questions" ADD CONSTRAINT "FK_37ef5879e7742e11cd9bfbcb5fc" FOREIGN KEY ("chapterId") REFERENCES "academy_chapters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "academy_quiz_questions" DROP CONSTRAINT "FK_37ef5879e7742e11cd9bfbcb5fc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapters" DROP COLUMN "quizEnabled"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_37ef5879e7742e11cd9bfbcb5f"`,
    );
    await queryRunner.query(`DROP TABLE "academy_quiz_questions"`);
  }
}
