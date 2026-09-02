import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { AcademyChapterRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-chapter.record';
import { AcademyCourseModuleRecord } from 'src/domain/academy/infrastructure/persistence/local/schema/academy-course-module.record';
import { GlobalSeeder } from './base-seeder';
import type { SeedState } from 'src/db/scripts/seed-minimal/seed-state';
import type { AcademyChapterFixture } from 'src/db/scripts/seed-minimal/seed-types';

export class AcademyContentSeeder extends GlobalSeeder {
  async seed(ctx: SeedState): Promise<void> {
    const chapters: AcademyChapterRecord[] = [];
    for (const fixture of ctx.fixture.academyChapters) {
      const chapter = await this.seedChapter(fixture);
      await this.seedModules(chapter.id, fixture);
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
}
