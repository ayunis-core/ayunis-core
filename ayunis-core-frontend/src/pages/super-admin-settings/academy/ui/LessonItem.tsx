import type { AcademyLessonResponseDto } from '@/shared/api';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { Button } from '@/shared/ui/shadcn/button';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';

interface LessonItemProps {
  lesson: AcademyLessonResponseDto;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export function LessonItem({
  lesson,
  onEdit,
  onDelete,
  isDeleting,
}: Readonly<LessonItemProps>) {
  return (
    <Item variant="outline" size="sm">
      <ItemContent>
        <ItemTitle>{lesson.title}</ItemTitle>
        {lesson.description && (
          <ItemDescription>{lesson.description}</ItemDescription>
        )}
      </ItemContent>
      <ItemActions>
        <Button variant="ghost" size="icon" asChild>
          <a href={lesson.loomUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </ItemActions>
    </Item>
  );
}
