import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Progress } from '@ayunis/ui/components/progress';
import type { AcademyChapterResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import type { ChapterModuleProgress } from '@/features/academy';

interface AcademyChapterItemProps {
  chapter: AcademyChapterResponseDto;
  moduleProgress: ChapterModuleProgress;
  confirmed: boolean;
  renewalDue: boolean;
}

function ChapterAction({
  chapterId,
  moduleProgress,
}: Readonly<{ chapterId: string; moduleProgress: ChapterModuleProgress }>) {
  const { t } = useTranslation('academy');

  if (moduleProgress.allComplete) {
    return (
      <Button asChild data-testid={`academy-chapter-complete-${chapterId}`}>
        <Link to="/academy/$chapterId/complete" params={{ chapterId }}>
          {t('detail.openConfirmation')}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      asChild
      variant="outline"
      data-testid={`academy-chapter-continue-${chapterId}`}
    >
      <Link
        to="/academy/$chapterId"
        params={{ chapterId }}
        search={{ module: moduleProgress.nextModule?.index ?? 0 }}
      >
        {moduleProgress.hasStarted
          ? t('moduleProgress.continue')
          : t('moduleProgress.start')}
      </Link>
    </Button>
  );
}

export function AcademyChapterItem({
  chapter,
  moduleProgress,
  confirmed,
  renewalDue,
}: Readonly<AcademyChapterItemProps>) {
  const { t } = useTranslation('academy');
  const { completedCount, totalCount } = moduleProgress;
  const percent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Item variant="outline">
      <Link
        to="/academy/$chapterId"
        params={{ chapterId: chapter.id }}
        className="min-w-0 flex-1"
        data-testid={`academy-chapter-${chapter.id}`}
      >
        <ItemContent>
          <ItemTitle className="flex items-center gap-2">
            {chapter.title}
            {!confirmed && totalCount > 0 && (
              <span
                className="text-xs font-normal text-muted-foreground tabular-nums"
                data-testid={`academy-chapter-count-${chapter.id}`}
              >
                {t('moduleProgress.count', {
                  completed: completedCount,
                  total: totalCount,
                })}
              </span>
            )}
            {confirmed && (
              <Badge
                variant="secondary"
                className="gap-1"
                data-testid={`academy-chapter-confirmed-${chapter.id}`}
              >
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                {t('progress.confirmed')}
              </Badge>
            )}
            {renewalDue && (
              <Badge variant="outline" className="gap-1">
                <RotateCcw className="h-3 w-3" />
                {t('progress.renewalDue')}
              </Badge>
            )}
          </ItemTitle>
          <ItemDescription>{chapter.description}</ItemDescription>
          {!confirmed && totalCount > 0 && (
            <Progress value={percent} className="mt-2 h-1" />
          )}
        </ItemContent>
      </Link>
      {!confirmed && (
        <ItemActions>
          <ChapterAction
            chapterId={chapter.id}
            moduleProgress={moduleProgress}
          />
        </ItemActions>
      )}
    </Item>
  );
}
