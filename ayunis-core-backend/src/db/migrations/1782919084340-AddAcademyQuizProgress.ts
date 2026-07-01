import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAcademyQuizProgress1782919084340 implements MigrationInterface {
  name = 'AddAcademyQuizProgress1782919084340';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "academy_completion" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "completedAt" TIMESTAMP NOT NULL, CONSTRAINT "UQ_academy_completion_userId" UNIQUE ("userId"), CONSTRAINT "PK_722753921b9d93a836836f3104d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "academy_chapter_progress" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "chapterId" character varying NOT NULL, "passedAt" TIMESTAMP, "lastScore" integer NOT NULL, "lastAttemptAt" TIMESTAMP NOT NULL, CONSTRAINT "UQ_academy_chapter_progress_userId_chapterId" UNIQUE ("userId", "chapterId"), CONSTRAINT "PK_67c1ea3857755fa775a436bbacb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_961aad6754409b40a0941b0ea5" ON "academy_chapter_progress" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapters" ADD "passThreshold" integer NOT NULL DEFAULT '80'`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_completion" ADD CONSTRAINT "FK_67f81c137898b80d17c7f10b9e9" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapter_progress" ADD CONSTRAINT "FK_961aad6754409b40a0941b0ea52" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapter_progress" ADD CONSTRAINT "FK_fd6b8e64f93dc35830e8c29b66d" FOREIGN KEY ("chapterId") REFERENCES "academy_chapters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "academy_chapter_progress" DROP CONSTRAINT "FK_fd6b8e64f93dc35830e8c29b66d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapter_progress" DROP CONSTRAINT "FK_961aad6754409b40a0941b0ea52"`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_completion" DROP CONSTRAINT "FK_67f81c137898b80d17c7f10b9e9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_chapters" DROP COLUMN "passThreshold"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_961aad6754409b40a0941b0ea5"`,
    );
    await queryRunner.query(`DROP TABLE "academy_chapter_progress"`);
    await queryRunner.query(`DROP TABLE "academy_completion"`);
  }
}
