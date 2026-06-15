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
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { LessonItem } from './LessonItem';

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5">
            <CardTitle>{chapter.title}</CardTitle>
            <CardDescription>{chapter.description}</CardDescription>
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
        {chapter.lessons.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            {t('page.noLessons')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {chapter.lessons.map((lesson) => (
              <LessonItem
                key={lesson.id}
                lesson={lesson}
                onEdit={() => onEditLesson(lesson)}
                onDelete={() => onDeleteLesson(lesson)}
                isDeleting={isDeletingLesson}
              />
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={onAddLesson}>
          <Plus className="h-4 w-4" />
          {t('page.addLesson')}
        </Button>
      </CardContent>
    </Card>
  );
}
