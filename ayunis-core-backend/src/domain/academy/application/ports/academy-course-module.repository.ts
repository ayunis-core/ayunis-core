import type { UUID } from 'crypto';
import type { AcademyCourseModule } from '../../domain/academy-course-module.entity';

export abstract class AcademyCourseModuleRepository {
  abstract findOne(id: UUID): Promise<AcademyCourseModule | null>;
  abstract findIdsByChapterId(chapterId: UUID): Promise<UUID[]>;
  abstract findMaxPosition(chapterId: UUID): Promise<number | null>;
  abstract create(
    courseModule: AcademyCourseModule,
  ): Promise<AcademyCourseModule>;
  abstract update(
    courseModule: AcademyCourseModule,
  ): Promise<AcademyCourseModule>;
  abstract delete(id: UUID): Promise<void>;
  abstract updatePositions(chapterId: UUID, orderedIds: UUID[]): Promise<void>;
}
