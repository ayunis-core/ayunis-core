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
  CourseModuleResponseDto,
  SuperAdminAcademyChapterResponseDto,
} from '@/shared/api';
import SuperAdminSettingsLayout from '../../super-admin-settings-layout';
import { Button } from '@/shared/ui/shadcn/button';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { ChapterCard } from './ChapterCard';
import { ChapterFormDialog } from './ChapterFormDialog';
import { ModuleFormDialog } from './ModuleFormDialog';
import { useDeleteChapter } from '../api/useDeleteChapter';
import { useDeleteModule } from '../api/useDeleteModule';
import { useReorderChapters } from '../api/useReorderChapters';
import { moveById } from '../lib/sortOrder';

interface AcademyPageProps {
  chapters: SuperAdminAcademyChapterResponseDto[];
}

interface ModuleDialogState {
  chapterId: string;
  module: CourseModuleResponseDto | null;
}

export default function AcademyPage({ chapters }: Readonly<AcademyPageProps>) {
  const { t } = useTranslation('super-admin-settings-academy');
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [editChapter, setEditChapter] =
    useState<SuperAdminAcademyChapterResponseDto | null>(null);
  const [moduleDialog, setModuleDialog] = useState<ModuleDialogState | null>(
    null,
  );
  const { deleteChapter, isDeleting: isDeletingChapter } = useDeleteChapter();
  const { deleteModule, isDeleting: isDeletingModule } = useDeleteModule();
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

  function handleDeleteChapter(chapter: SuperAdminAcademyChapterResponseDto) {
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

  function handleDeleteModule(module: CourseModuleResponseDto) {
    confirm({
      title: t('deleteModule.title'),
      description: t('deleteModule.description', { title: module.title }),
      confirmText: t('deleteModule.confirm'),
      cancelText: t('deleteModule.cancel'),
      variant: 'destructive',
      onConfirm: () => {
        deleteModule(module.id);
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
                  onAddModule={() =>
                    setModuleDialog({ chapterId: chapter.id, module: null })
                  }
                  onEditModule={(module) =>
                    setModuleDialog({ chapterId: chapter.id, module })
                  }
                  onDeleteModule={handleDeleteModule}
                  isDeletingChapter={isDeletingChapter}
                  isDeletingModule={isDeletingModule}
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
      <ModuleFormDialog
        open={moduleDialog !== null}
        onOpenChange={(open) => {
          if (!open) setModuleDialog(null);
        }}
        chapterId={moduleDialog?.chapterId ?? null}
        module={moduleDialog?.module ?? null}
      />
    </SuperAdminSettingsLayout>
  );
}
