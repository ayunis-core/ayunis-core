import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReleaseNoteReadState1795102248540 implements MigrationInterface {
  name = 'AddReleaseNoteReadState1795102248540';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "release_note_reads" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "releaseNoteId" character varying NOT NULL, CONSTRAINT "UQ_884eebad2a5bad3e43e5b81f389" UNIQUE ("userId", "releaseNoteId"), CONSTRAINT "PK_49110050d7cb7aa7b44d883bf3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3eb9154377a0ccc44283dcb87e" ON "release_note_reads" ("releaseNoteId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "release_notes" ADD "announced" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_notes" ADD "publishedOn" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_note_reads" ADD CONSTRAINT "FK_d4272a0ee57151b0b9977e6e2c4" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_note_reads" ADD CONSTRAINT "FK_3eb9154377a0ccc44283dcb87e4" FOREIGN KEY ("releaseNoteId") REFERENCES "release_notes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "release_note_reads" DROP CONSTRAINT "FK_3eb9154377a0ccc44283dcb87e4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_note_reads" DROP CONSTRAINT "FK_d4272a0ee57151b0b9977e6e2c4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_notes" DROP COLUMN "publishedOn"`,
    );
    await queryRunner.query(
      `ALTER TABLE "release_notes" DROP COLUMN "announced"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3eb9154377a0ccc44283dcb87e"`,
    );
    await queryRunner.query(`DROP TABLE "release_note_reads"`);
  }
}
