import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

type MigrationConstructor = new () => MigrationInterface;

async function loadMigration(): Promise<MigrationInterface> {
  const migrationsDirectory = join(__dirname, '../migrations');
  const fileName = readdirSync(migrationsDirectory).find((name) =>
    name.endsWith('-ReplaceAcademyQuizWithChapterConfirmations.ts'),
  );
  if (!fileName) {
    throw new Error('Academy confirmation migration has not been generated');
  }

  const exports = (await import(join(migrationsDirectory, fileName))) as Record<
    string,
    unknown
  >;
  const migration = Object.values(exports).find(
    (value): value is MigrationConstructor =>
      typeof value === 'function' &&
      'prototype' in value &&
      typeof value.prototype === 'object' &&
      value.prototype !== null &&
      'up' in value.prototype,
  );
  if (!migration) {
    throw new Error(`No migration class exported by ${fileName}`);
  }
  return new migration();
}

describe('ReplaceAcademyQuizWithChapterConfirmations migration', () => {
  it('copies only successful quiz passes before removing quiz persistence', async () => {
    const migration = await loadMigration();
    const query = jest.fn().mockResolvedValue(undefined);

    await migration.up({ query } as unknown as QueryRunner);

    const statements = query.mock.calls.map(([sql]) => String(sql));
    const createIndex = statements.findIndex((sql) =>
      sql.includes('CREATE TABLE "academy_chapter_confirmations"'),
    );
    const copyIndex = statements.findIndex(
      (sql) =>
        sql.includes('INSERT INTO "academy_chapter_confirmations"') &&
        sql.includes('"passedAt" IS NOT NULL') &&
        sql.includes('"passedAt" AS "confirmedAt"'),
    );
    const dropProgressIndex = statements.findIndex((sql) =>
      sql.includes('DROP TABLE "academy_chapter_progress"'),
    );

    expect(createIndex).toBeGreaterThanOrEqual(0);
    expect(copyIndex).toBeGreaterThan(createIndex);
    expect(dropProgressIndex).toBeGreaterThan(copyIndex);
    expect(
      statements.some((sql) => sql.includes('DROP TABLE "academy_completion"')),
    ).toBe(false);
    expect(
      statements.some((sql) =>
        sql.includes('DROP TABLE "academy_quiz_questions"'),
      ),
    ).toBe(true);
    expect(
      statements.some(
        (sql) =>
          sql.includes('DROP COLUMN "quizEnabled"') ||
          sql.includes('DROP COLUMN "passThreshold"'),
      ),
    ).toBe(true);
  });
});
