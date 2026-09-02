import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { AcademyChapterRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-chapter.record';
import { AcademyCourseModuleRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-course-module.record';
import { AcademyQuizQuestionRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-quiz-question.record';
import { GlobalSeeder } from './base-seeder';
import type { SeedState } from 'src/db/scripts/seed-minimal/seed-state';
import type { AcademyChapterFixture } from 'src/db/scripts/seed-minimal/seed-types';

/**
 * Academy chapters, their modules and their quizzes. Platform-wide content, so
 * it seeds once rather than per org — without it nobody can actually earn the
 * KI-Schulung nach EU AI Act locally, which is the one part of the flow that
 * seeded completion rows cannot stand in for.
 */
export class AcademyContentSeeder extends GlobalSeeder {
  async seed(ctx: SeedState): Promise<void> {
    const chapters: AcademyChapterRecord[] = [];

    for (const fixture of ctx.fixture.academyChapters) {
      const chapter = await this.seedChapter(fixture);
      await this.seedModules(chapter.id, fixture);
      await this.seedQuiz(chapter.id, fixture);
      chapters.push(chapter);
    }

    ctx.setAcademyChapters(chapters);
  }

  private async seedChapter(
    fixture: AcademyChapterFixture,
  ): Promise<AcademyChapterRecord> {
    return this.findOrCreate(
      this.repo(AcademyChapterRecord),
      { title: fixture.title },
      () => ({
        id: randomUUID(),
        title: fixture.title,
        description: fixture.description,
        position: fixture.position,
        quizEnabled: fixture.quizEnabled,
        passThreshold: fixture.passThreshold,
      }),
      { entity: 'Academy chapter', name: fixture.title },
    );
  }

  private async seedModules(
    chapterId: UUID,
    fixture: AcademyChapterFixture,
  ): Promise<void> {
    for (const courseModule of fixture.modules) {
      await this.findOrCreate(
        this.repo(AcademyCourseModuleRecord),
        { chapterId, position: courseModule.position },
        () => ({
          id: randomUUID(),
          chapterId,
          title: courseModule.title,
          description: courseModule.description,
          loomUrl: courseModule.loomUrl,
          position: courseModule.position,
        }),
        { entity: 'Academy module', name: courseModule.title },
      );
    }
  }

  private async seedQuiz(
    chapterId: UUID,
    fixture: AcademyChapterFixture,
  ): Promise<void> {
    for (const question of fixture.quiz) {
      await this.findOrCreate(
        this.repo(AcademyQuizQuestionRecord),
        { chapterId, position: question.position },
        () => ({
          id: randomUUID(),
          chapterId,
          text: question.text,
          options: question.options.map((option) => ({ ...option })),
          position: question.position,
        }),
        {
          entity: 'Academy quiz question',
          name: `${fixture.title} #${question.position}`,
        },
      );
    }
  }
}
