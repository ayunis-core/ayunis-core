import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CascadeDeleteSharesOnScopeDelete1769163990566
  implements MigrationInterface
{
  name = 'CascadeDeleteSharesOnScopeDelete1769163990566';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shares" DROP CONSTRAINT "FK_adc3637e31eabc1b8cb3df5c27b"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."share_scopes_scope_type_enum" RENAME TO "share_scopes_scope_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."share_scopes_scope_type_enum" AS ENUM('org', 'team')`,
    );
    await queryRunner.query(
      `ALTER TABLE "share_scopes" ALTER COLUMN "scope_type" TYPE "public"."share_scopes_scope_type_enum" USING "scope_type"::"text"::"public"."share_scopes_scope_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."share_scopes_scope_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shares" ADD CONSTRAINT "FK_adc3637e31eabc1b8cb3df5c27b" FOREIGN KEY ("scope_id") REFERENCES "share_scopes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shares" DROP CONSTRAINT "FK_adc3637e31eabc1b8cb3df5c27b"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."share_scopes_scope_type_enum_old" AS ENUM('org', 'user', 'team')`,
    );
    await queryRunner.query(
      `ALTER TABLE "share_scopes" ALTER COLUMN "scope_type" TYPE "public"."share_scopes_scope_type_enum_old" USING "scope_type"::"text"::"public"."share_scopes_scope_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."share_scopes_scope_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."share_scopes_scope_type_enum_old" RENAME TO "share_scopes_scope_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shares" ADD CONSTRAINT "FK_adc3637e31eabc1b8cb3df5c27b" FOREIGN KEY ("scope_id") REFERENCES "share_scopes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
