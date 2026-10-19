import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAcademyCertificateMembersView1792430205613 implements MigrationInterface {
  name = 'CreateAcademyCertificateMembersView1792430205613';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE VIEW "academy_certificate_members" AS SELECT "member"."id" AS "userId", "member"."email" AS "email", "member"."name" AS "name", "member"."orgId" AS "orgId", "completion"."completedAt" AS "completedAt" FROM "users" "member" LEFT JOIN "academy_completion" "completion" ON "completion"."userId" = "member"."id"`,
    );
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      [
        'public',
        'VIEW',
        'academy_certificate_members',
        'SELECT "member"."id" AS "userId", "member"."email" AS "email", "member"."name" AS "name", "member"."orgId" AS "orgId", "completion"."completedAt" AS "completedAt" FROM "users" "member" LEFT JOIN "academy_completion" "completion" ON "completion"."userId" = "member"."id"',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['VIEW', 'academy_certificate_members', 'public'],
    );
    await queryRunner.query(`DROP VIEW "academy_certificate_members"`);
  }
}
