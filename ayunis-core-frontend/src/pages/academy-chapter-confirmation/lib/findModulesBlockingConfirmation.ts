import type {
  AcademyChapterResponseDto,
  AcademyProgressResponseDto,
  CourseModuleResponseDto,
} from '@/shared/api';

export function findModulesBlockingConfirmation(
  chapter: AcademyChapterResponseDto,
  progress: AcademyProgressResponseDto,
): CourseModuleResponseDto[] {
  // A confirmation the server will replay needs no page time, which matters
  // after completing the academy cleared it and the response was lost.
  const replayable = progress.chapters.some(
    ({ chapterId, replayable }) => chapterId === chapter.id && replayable,
  );
  if (replayable) {
    return [];
  }

  const secondsByModule = new Map(
    progress.courseModules.map(({ courseModuleId, visibleSeconds }) => [
      courseModuleId,
      visibleSeconds,
    ]),
  );
  return [...chapter.courseModules]
    .sort((a, b) => a.position - b.position)
    .filter(
      ({ id }) =>
        (secondsByModule.get(id) ?? 0) < progress.minimumModuleSeconds,
    );
}
