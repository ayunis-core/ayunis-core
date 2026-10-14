import { describe, expect, it } from 'vitest';
import type {
  AcademyChapterResponseDto,
  AcademyProgressResponseDto,
  CourseModuleResponseDto,
} from '@/shared/api';
import { findModulesBlockingConfirmation } from './findModulesBlockingConfirmation';

function courseModule(id: string, position: number): CourseModuleResponseDto {
  return {
    id,
    chapterId: 'chapter',
    title: `Video ${id}`,
    loomUrl: 'https://www.loom.com/share/abc',
    position,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  } as CourseModuleResponseDto;
}

function progress(
  visible: Record<string, number>,
  minimumModuleSeconds = 60,
): AcademyProgressResponseDto {
  return {
    chapters: [],
    academyCompletedAt: null,
    academyCompletionExpiresAt: null,
    courseModules: Object.entries(visible).map(
      ([courseModuleId, visibleSeconds]) => ({
        courseModuleId,
        visibleSeconds,
      }),
    ),
    minimumModuleSeconds,
  };
}

describe('findModulesBlockingConfirmation', () => {
  const chapter = {
    id: 'chapter',
    courseModules: [courseModule('b', 1), courseModule('a', 0)],
  } as AcademyChapterResponseDto;

  it('lists unopened and short modules in chapter order', () => {
    expect(
      findModulesBlockingConfirmation(chapter, progress({ b: 59.5 })).map(
        ({ id }) => id,
      ),
    ).toEqual(['a', 'b']);
  });

  it('returns nothing once every module reached the minimum', () => {
    expect(
      findModulesBlockingConfirmation(chapter, progress({ a: 60, b: 61 })),
    ).toEqual([]);
  });

  it('returns nothing when the minimum is 0', () => {
    expect(findModulesBlockingConfirmation(chapter, progress({}, 0))).toEqual(
      [],
    );
  });

  it('returns nothing while the chapter confirmation would be replayed', () => {
    const replay = progress({});
    replay.chapters = [
      {
        chapterId: 'chapter',
        confirmed: true,
        confirmationValid: true,
        confirmedAt: new Date().toISOString(),
        replayable: true,
      },
    ];

    expect(findModulesBlockingConfirmation(chapter, replay)).toEqual([]);
  });
});
