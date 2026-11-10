import type {
  AcademyChapterResponseDto,
  AcademyProgressResponseDto,
  CourseModuleResponseDto,
} from '@/shared/api';

export type ModuleProgressState = 'notStarted' | 'inProgress' | 'complete';

export interface ModuleProgress {
  courseModule: CourseModuleResponseDto;
  index: number;
  state: ModuleProgressState;
}

export interface ChapterModuleProgress {
  modules: ModuleProgress[];
  completedCount: number;
  totalCount: number;
  nextModule?: ModuleProgress;
  hasStarted: boolean;
  allComplete: boolean;
}

function resolveState(
  visibleSeconds: number,
  minimumSeconds: number,
): ModuleProgressState {
  if (visibleSeconds >= minimumSeconds) return 'complete';
  return visibleSeconds > 0 ? 'inProgress' : 'notStarted';
}

export function getChapterModuleProgress(
  chapter: AcademyChapterResponseDto,
  progress: AcademyProgressResponseDto | undefined,
  confirmed = false,
): ChapterModuleProgress {
  const minimumSeconds = progress?.minimumModuleSeconds ?? 0;
  const secondsByModule = new Map(
    (progress?.courseModules ?? []).map(
      ({ courseModuleId, visibleSeconds }) => [courseModuleId, visibleSeconds],
    ),
  );

  const modules = [...chapter.courseModules]
    .sort((a, b) => a.position - b.position)
    .map((courseModule, index) => {
      const visibleSeconds = secondsByModule.get(courseModule.id) ?? 0;
      return {
        courseModule,
        index,
        state: confirmed
          ? 'complete'
          : resolveState(visibleSeconds, minimumSeconds),
      };
    });

  const completedCount = modules.filter(
    ({ state }) => state === 'complete',
  ).length;

  return {
    modules,
    completedCount,
    totalCount: modules.length,
    nextModule: modules.find(({ state }) => state !== 'complete'),
    hasStarted: modules.some(({ state }) => state !== 'notStarted'),
    allComplete: completedCount === modules.length,
  };
}
