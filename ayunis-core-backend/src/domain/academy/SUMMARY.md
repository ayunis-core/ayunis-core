# Academy Module

## Purpose

The academy provides admin-managed learning content organized as chapters that group ordered lessons. Each lesson links to a Loom video and carries a title, optional description, and a position within its chapter.

## Key Concepts

- **Chapter**: A titled, described, positioned grouping of lessons (`AcademyChapter`).
- **Lesson**: A titled video lesson belonging to a chapter, with an optional description, a Loom URL, and a position within the chapter (`AcademyLesson`).
- **Ordering**: Both chapters and lessons are ordered by an integer `position`. Repositories expose `findMaxPosition` for appending and `updatePositions` for reordering.

## Structure

```text
academy/
├── SUMMARY.md
├── domain/
│   ├── academy-chapter.entity.ts   # AcademyChapter domain entity (holds its lessons)
│   └── academy-lesson.entity.ts    # AcademyLesson domain entity
├── application/
│   ├── academy.errors.ts           # Domain errors + AcademyErrorCode
│   └── ports/
│       ├── academy-chapter.repository.ts  # Abstract chapter repository interface
│       └── academy-lesson.repository.ts   # Abstract lesson repository interface
├── infrastructure/
│   └── persistence/local/
│       ├── schema/
│       │   ├── academy-chapter.record.ts  # AcademyChapterRecord TypeORM entity
│       │   └── academy-lesson.record.ts   # AcademyLessonRecord TypeORM entity (ManyToOne chapter)
│       ├── mappers/academy.mapper.ts      # Domain ↔ Record conversion for chapters and lessons
│       ├── local-academy-chapter.repository.ts  # PostgreSQL chapter repository
│       └── local-academy-lesson.repository.ts   # PostgreSQL lesson repository
└── academy.module.ts               # NestJS wiring
```

## Errors

- `ChapterNotFoundError` (404) — chapter id not found.
- `LessonNotFoundError` (404) — lesson id not found.
- `InvalidReorderError` (400) — submitted ids do not match the current set of items.
- `UnexpectedAcademyError` (500) — wraps unexpected errors.

## Module Wiring

`AcademyModule` registers the `AcademyChapterRecord` and `AcademyLessonRecord` TypeORM entities, the `AcademyMapper`, and binds the `AcademyChapterRepository` / `AcademyLessonRepository` ports to their local PostgreSQL implementations (`LocalAcademyChapterRepository`, `LocalAcademyLessonRepository`).
