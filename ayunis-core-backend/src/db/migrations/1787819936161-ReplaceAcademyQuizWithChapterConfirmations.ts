import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceAcademyQuizWithChapterConfirmations1787819936161 implements MigrationInterface {
  name = 'ReplaceAcademyQuizWithChapterConfirmations1787819936161';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "academy_chapter_confirmations" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "chapterId" character varying NOT NULL, "confirmedAt" TIMESTAMP NOT NULL, CONSTRAINT "UQ_academy_chapter_confirmations_userId_chapterId" UNIQUE ("userId", "chapterId"), CONSTRAINT "PK_35f97d93f688fbbf835719fdb13" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2cca858b2ac1cdff031e8c9ba7" ON "academy_chapter_confirmations" ("userId") `,
    );
    await queryRunner.query(
      `INSERT INTO "academy_chapter_confirmations" ("id", "createdAt", "updatedAt", "userId", "chapterId", "confirmedAt") SELECT "id", "createdAt", "updatedAt", "userId", "chapterId", "passedAt" AS "confirmedAt" FROM "academy_chapter_progress" WHERE "passedAt" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapter_progress" DROP CONSTRAINT "FK_fd6b8e64f93dc35830e8c29b66d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapter_progress" DROP CONSTRAINT "FK_961aad6754409b40a0941b0ea52"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_961aad6754409b40a0941b0ea5"`,
    );
    await queryRunner.query(`DROP TABLE "academy_chapter_progress"`);
    await queryRunner.query(
      `ALTER TABLE "academy_quiz_questions" DROP CONSTRAINT "FK_37ef5879e7742e11cd9bfbcb5fc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_37ef5879e7742e11cd9bfbcb5f"`,
    );
    await queryRunner.query(`DROP TABLE "academy_quiz_questions"`);
    await queryRunner.query(
      `ALTER TABLE "academy_chapters" DROP COLUMN "quizEnabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapters" DROP COLUMN "passThreshold"`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapter_confirmations" ADD CONSTRAINT "FK_2cca858b2ac1cdff031e8c9ba78" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapter_confirmations" ADD CONSTRAINT "FK_1ae6af6c2fb5c497d8af8b193e7" FOREIGN KEY ("chapterId") REFERENCES "academy_chapters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "academy_chapter_confirmations" DROP CONSTRAINT "FK_1ae6af6c2fb5c497d8af8b193e7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapter_confirmations" DROP CONSTRAINT "FK_2cca858b2ac1cdff031e8c9ba78"`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapters" ADD "passThreshold" integer NOT NULL DEFAULT '80'`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapters" ADD "quizEnabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE TABLE "academy_quiz_questions" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "chapterId" character varying NOT NULL, "text" text NOT NULL, "options" jsonb NOT NULL, "position" integer NOT NULL, CONSTRAINT "PK_2351acb2a20e16b6d87f986d25c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_37ef5879e7742e11cd9bfbcb5f" ON "academy_quiz_questions" ("chapterId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "academy_chapter_progress" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "chapterId" character varying NOT NULL, "passedAt" TIMESTAMP, "lastScore" integer NOT NULL, "lastAttemptAt" TIMESTAMP NOT NULL, CONSTRAINT "UQ_academy_chapter_progress_userId_chapterId" UNIQUE ("userId", "chapterId"), CONSTRAINT "PK_67c1ea3857755fa775a436bbacb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_961aad6754409b40a0941b0ea5" ON "academy_chapter_progress" ("userId") `,
    );
    await queryRunner.query(
      `INSERT INTO "academy_chapter_progress" ("id", "createdAt", "updatedAt", "userId", "chapterId", "passedAt", "lastScore", "lastAttemptAt") SELECT "id", "createdAt", "updatedAt", "userId", "chapterId", "confirmedAt", 100, "confirmedAt" FROM "academy_chapter_confirmations"`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_quiz_questions" ADD CONSTRAINT "FK_37ef5879e7742e11cd9bfbcb5fc" FOREIGN KEY ("chapterId") REFERENCES "academy_chapters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapter_progress" ADD CONSTRAINT "FK_961aad6754409b40a0941b0ea52" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapter_progress" ADD CONSTRAINT "FK_fd6b8e64f93dc35830e8c29b66d" FOREIGN KEY ("chapterId") REFERENCES "academy_chapters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2cca858b2ac1cdff031e8c9ba7"`,
    );
    await queryRunner.query(`DROP TABLE "academy_chapter_confirmations"`);
  }
}
