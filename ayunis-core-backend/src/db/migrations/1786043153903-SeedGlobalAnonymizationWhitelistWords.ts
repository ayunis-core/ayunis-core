import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedGlobalAnonymizationWhitelistWords1786043153903 implements MigrationInterface {
  name = 'SeedGlobalAnonymizationWhitelistWords1786043153903';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Reported false positives: generic German terms the PII detector kept
    // flagging as person names. wordLowercase is spelled out rather than
    // derived via lower() so it matches the application's toLowerCase(),
    // independent of the database collation.
    await queryRunner.query(`
            INSERT INTO "global_anonymization_whitelist_words" ("id", "category", "word", "wordLowercase", "createdByUserId")
            SELECT gen_random_uuid()::text, 'person_name'::"public"."global_anonymization_whitelist_words_category_enum", w.word, w."wordLowercase", NULL
            FROM (VALUES
                ('Mitarbeitende', 'mitarbeitende'),
                ('Führungskräfte', 'führungskräfte'),
                ('Menschen', 'menschen'),
                ('in', 'in'),
                ('Wir', 'wir'),
                ('Sie', 'sie'),
                ('Ich', 'ich'),
                ('Du', 'du'),
                ('Kollege', 'kollege'),
                ('Fachmann', 'fachmann')
            ) AS w(word, "wordLowercase")
            ON CONFLICT ("category", "wordLowercase") DO NOTHING
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DELETE FROM "global_anonymization_whitelist_words"
            WHERE "category" = 'person_name'
              AND "createdByUserId" IS NULL
              AND "wordLowercase" IN (
                'mitarbeitende',
                'führungskräfte',
                'menschen',
                'in',
                'wir',
                'sie',
                'ich',
                'du',
                'kollege',
                'fachmann'
              )
        `);
  }
}
