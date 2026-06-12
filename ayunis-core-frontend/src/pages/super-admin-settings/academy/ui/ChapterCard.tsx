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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import type {
  AcademyChapterResponseDto,
  AcademyLessonResponseDto,
} from '@/shared/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Button } from '@/shared/ui/shadcn/button';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { LessonItem } from './LessonItem';
import { useReorderLessons } from '../api/useReorderLessons';
import { moveById } from '../lib/sortOrder';

interface ChapterCardProps {
  chapter: AcademyChapterResponseDto;
  onEdit: () => void;
  onDelete: () => void;
  onAddLesson: () => void;
  onEditLesson: (lesson: AcademyLessonResponseDto) => void;
  onDeleteLesson: (lesson: AcademyLessonResponseDto) => void;
  isDeletingChapter: boolean;
  isDeletingLesson: boolean;
}

export function ChapterCard({
  chapter,
  onEdit,
  onDelete,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  isDeletingChapter,
  isDeletingLesson,
}: Readonly<ChapterCardProps>) {
  const { t } = useTranslation('super-admin-settings-academy');
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  // Optimistic order during drag; re-synced whenever the loader data changes
  const [orderedLessons, setOrderedLessons] = useState(chapter.lessons);
  const [prevLessons, setPrevLessons] = useState(chapter.lessons);
  if (prevLessons !== chapter.lessons) {
    setPrevLessons(chapter.lessons);
    setOrderedLessons(chapter.lessons);
  }

  const { reorderLessons } = useReorderLessons();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleLessonDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const next = moveById(orderedLessons, String(active.id), String(over.id));
    if (!next) return;
    setOrderedLessons(next);
    reorderLessons(
      chapter.id,
      next.map((lesson) => lesson.id),
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={isDragging ? 'z-10 opacity-60' : undefined}
    >
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1">
              <Button
                ref={setActivatorNodeRef}
                variant="ghost"
                size="icon"
                className="cursor-grab touch-none"
                aria-label={t('page.dragChapter')}
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </Button>
              <div className="space-y-1.5 pt-1.5">
                <CardTitle>{chapter.title}</CardTitle>
                <CardDescription>{chapter.description}</CardDescription>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={onDelete}
                disabled={isDeletingChapter}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {orderedLessons.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              {t('page.noLessons')}
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleLessonDragEnd}
            >
              <SortableContext
                items={orderedLessons.map((lesson) => lesson.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {orderedLessons.map((lesson) => (
                    <LessonItem
                      key={lesson.id}
                      lesson={lesson}
                      onEdit={() => onEditLesson(lesson)}
                      onDelete={() => onDeleteLesson(lesson)}
                      isDeleting={isDeletingLesson}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          <Button variant="outline" size="sm" onClick={onAddLesson}>
            <Plus className="h-4 w-4" />
            {t('page.addLesson')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
