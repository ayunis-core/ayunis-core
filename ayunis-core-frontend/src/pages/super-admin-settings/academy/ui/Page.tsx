import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTranslation } from 'react-i18next';
import type {
  AcademyChapterResponseDto,
  AcademyLessonResponseDto,
} from '@/shared/api';
import SuperAdminSettingsLayout from '../../super-admin-settings-layout';
import { Button } from '@/shared/ui/shadcn/button';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { ChapterCard } from './ChapterCard';
import { ChapterFormDialog } from './ChapterFormDialog';
import { LessonFormDialog } from './LessonFormDialog';
import { useDeleteChapter } from '../api/useDeleteChapter';
import { useDeleteLesson } from '../api/useDeleteLesson';
import { useReorderChapters } from '../api/useReorderChapters';
import { moveById } from '../lib/sortOrder';

interface AcademyPageProps {
  chapters: AcademyChapterResponseDto[];
}

interface LessonDialogState {
  chapterId: string;
  lesson: AcademyLessonResponseDto | null;
}

export default function AcademyPage({ chapters }: Readonly<AcademyPageProps>) {
  const { t } = useTranslation('super-admin-settings-academy');
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [editChapter, setEditChapter] =
    useState<AcademyChapterResponseDto | null>(null);
  const [lessonDialog, setLessonDialog] = useState<LessonDialogState | null>(
    null,
  );
  const { deleteChapter, isDeleting: isDeletingChapter } = useDeleteChapter();
  const { deleteLesson, isDeleting: isDeletingLesson } = useDeleteLesson();
  const { reorderChapters, isReordering } = useReorderChapters();
  const { confirm } = useConfirmation();

  // Optimistic order during drag; re-synced from loader data, except while a
  // reorder is in flight so an unrelated refetch cannot snap back the order.
  const [orderedChapters, setOrderedChapters] = useState(chapters);
  const [prevChapters, setPrevChapters] = useState(chapters);
  if (prevChapters !== chapters) {
    setPrevChapters(chapters);
    if (!isReordering) {
      setOrderedChapters(chapters);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleChapterDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const next = moveById(orderedChapters, String(active.id), String(over.id));
    if (!next) return;
    setOrderedChapters(next);
    reorderChapters(next.map((chapter) => chapter.id));
  }

  function handleDeleteChapter(chapter: AcademyChapterResponseDto) {
    confirm({
      title: t('deleteChapter.title'),
      description: t('deleteChapter.description', { title: chapter.title }),
      confirmText: t('deleteChapter.confirm'),
      cancelText: t('deleteChapter.cancel'),
      variant: 'destructive',
      onConfirm: () => {
        deleteChapter(chapter.id);
      },
    });
  }

  function handleDeleteLesson(lesson: AcademyLessonResponseDto) {
    confirm({
      title: t('deleteLesson.title'),
      description: t('deleteLesson.description', { title: lesson.title }),
      confirmText: t('deleteLesson.confirm'),
      cancelText: t('deleteLesson.cancel'),
      variant: 'destructive',
      onConfirm: () => {
        deleteLesson(lesson.id);
      },
    });
  }

  return (
    <SuperAdminSettingsLayout
      pageTitle={t('page.title')}
      action={
        <Button
          size="sm"
          onClick={() => {
            setEditChapter(null);
            setChapterDialogOpen(true);
          }}
        >
          {t('page.addChapter')}
        </Button>
      }
    >
      {orderedChapters.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-2 py-10 text-center">
          <h3 className="text-lg font-semibold">{t('page.empty')}</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t('page.emptyDescription')}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleChapterDragEnd}
        >
          <SortableContext
            items={orderedChapters.map((chapter) => chapter.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-4">
              {orderedChapters.map((chapter) => (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  onEdit={() => {
                    setEditChapter(chapter);
                    setChapterDialogOpen(true);
                  }}
                  onDelete={() => handleDeleteChapter(chapter)}
                  onAddLesson={() =>
                    setLessonDialog({ chapterId: chapter.id, lesson: null })
                  }
                  onEditLesson={(lesson) =>
                    setLessonDialog({ chapterId: chapter.id, lesson })
                  }
                  onDeleteLesson={handleDeleteLesson}
                  isDeletingChapter={isDeletingChapter}
                  isDeletingLesson={isDeletingLesson}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ChapterFormDialog
        open={chapterDialogOpen}
        onOpenChange={(open) => {
          setChapterDialogOpen(open);
          if (!open) setEditChapter(null);
        }}
        chapter={editChapter}
      />
      <LessonFormDialog
        open={lessonDialog !== null}
        onOpenChange={(open) => {
          if (!open) setLessonDialog(null);
        }}
        chapterId={lessonDialog?.chapterId ?? null}
        lesson={lessonDialog?.lesson ?? null}
      />
    </SuperAdminSettingsLayout>
  );
}
