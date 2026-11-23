import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnonymousArtifactDictionaries1795341359863 implements MigrationInterface {
  name = 'AddAnonymousArtifactDictionaries1795341359863';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."artifact_pii_masks_category_enum" AS ENUM('person_name', 'organization', 'location', 'email_address', 'phone_number', 'url_or_ip', 'date_time', 'financial_account', 'government_id', 'nationality_religion_politics', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "artifact_pii_masks" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "artifactId" character varying NOT NULL, "category" "public"."artifact_pii_masks_category_enum" NOT NULL, "maskIndex" integer NOT NULL, "value" text NOT NULL, CONSTRAINT "UQ_9c20bd5559bd94e6839344bf260" UNIQUE ("artifactId", "category", "value"), CONSTRAINT "UQ_1008b5bc04f9a1c90f2f344d2bd" UNIQUE ("artifactId", "category", "maskIndex"), CONSTRAINT "PK_1d0c0fe65be5200a106a9ef7e17" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" ADD "isAnonymous" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifact_pii_masks" ADD CONSTRAINT "FK_8bd692f12a41f80ede1083a1838" FOREIGN KEY ("artifactId") REFERENCES "artifacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // Artifacts of anonymous chats become anonymous artifacts.
    await queryRunner.query(
      `UPDATE "artifacts" SET "isAnonymous" = true FROM "threads" WHERE "threads"."id" = "artifacts"."threadId" AND "threads"."isAnonymous" = true`,
    );
    // Each one gets a copy of its chat's entries for the placeholders that
    // occur in its title or any of its versions, with the same token, so its
    // title and content stay unchanged. Manual unmasking stays with the chat.
    await queryRunner.query(
      `INSERT INTO "artifact_pii_masks" ("id", "artifactId", "category", "maskIndex", "value", "createdAt", "updatedAt") SELECT gen_random_uuid()::text, "artifacts"."id", "thread_pii_masks"."category"::text::"public"."artifact_pii_masks_category_enum", "thread_pii_masks"."maskIndex", "thread_pii_masks"."value", now(), now() FROM "artifacts" JOIN "thread_pii_masks" ON "thread_pii_masks"."threadId" = "artifacts"."threadId" CROSS JOIN LATERAL (SELECT '{{pii:' || upper("thread_pii_masks"."category"::text) || '_' || "thread_pii_masks"."maskIndex" || '}}' AS "token") AS "placeholder" WHERE "artifacts"."isAnonymous" = true AND (strpos("artifacts"."title", "placeholder"."token") > 0 OR EXISTS (SELECT 1 FROM "artifact_versions" WHERE "artifact_versions"."artifactId" = "artifacts"."id" AND strpos("artifact_versions"."content", "placeholder"."token") > 0))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "artifact_pii_masks" DROP CONSTRAINT "FK_8bd692f12a41f80ede1083a1838"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" DROP COLUMN "isAnonymous"`,
    );
    await queryRunner.query(`DROP TABLE "artifact_pii_masks"`);
    await queryRunner.query(
      `DROP TYPE "public"."artifact_pii_masks_category_enum"`,
    );
  }
}
