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
  CourseModuleResponseDto,
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
import { ModuleItem } from './ModuleItem';
import { useReorderModules } from '../api/useReorderModules';
import { moveById } from '../lib/sortOrder';

interface ChapterCardProps {
  chapter: AcademyChapterResponseDto;
  onEdit: () => void;
  onDelete: () => void;
  onAddModule: () => void;
  onEditModule: (module: CourseModuleResponseDto) => void;
  onDeleteModule: (module: CourseModuleResponseDto) => void;
  isDeletingChapter: boolean;
  isDeletingModule: boolean;
}

export function ChapterCard({
  chapter,
  onEdit,
  onDelete,
  onAddModule,
  onEditModule,
  onDeleteModule,
  isDeletingChapter,
  isDeletingModule,
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

  const { reorderModules, isReordering } = useReorderModules();

  // Optimistic order during drag; re-synced from loader data, except while a
  // reorder is in flight so an unrelated refetch cannot snap back the order.
  const [orderedModules, setOrderedModules] = useState(chapter.courseModules);
  const [prevModules, setPrevModules] = useState(chapter.courseModules);
  if (prevModules !== chapter.courseModules) {
    setPrevModules(chapter.courseModules);
    if (!isReordering) {
      setOrderedModules(chapter.courseModules);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleModuleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const next = moveById(orderedModules, String(active.id), String(over.id));
    if (!next) return;
    setOrderedModules(next);
    reorderModules(
      chapter.id,
      next.map((module) => module.id),
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
          {orderedModules.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              {t('page.noModules')}
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleModuleDragEnd}
            >
              <SortableContext
                items={orderedModules.map((module) => module.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {orderedModules.map((module) => (
                    <ModuleItem
                      key={module.id}
                      module={module}
                      onEdit={() => onEditModule(module)}
                      onDelete={() => onDeleteModule(module)}
                      isDeleting={isDeletingModule}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
          <Button variant="outline" size="sm" onClick={onAddModule}>
            <Plus className="h-4 w-4" />
            {t('page.addModule')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
