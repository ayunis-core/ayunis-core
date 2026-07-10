import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { EmptyState } from '@/widgets/empty-state';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { Badge } from '@/shared/ui/shadcn/badge';
import { CheckCircle2, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import type { AcademyChapterResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useAcademyProgress } from '../api/useAcademyProgress';

interface AcademyPageProps {
  chapters: AcademyChapterResponseDto[];
}

export default function AcademyPage({ chapters }: Readonly<AcademyPageProps>) {
  const { t } = useTranslation('academy');
  const { progress } = useAcademyProgress();

  const passedChapterIds = new Set(
    (progress?.chapters ?? []).filter((c) => c.passed).map((c) => c.chapterId),
  );

  const sortedChapters = [...chapters].sort((a, b) => a.position - b.position);

  const header = (
    <ContentAreaHeader breadcrumbs={[{ label: t('page.title') }]} />
  );

  if (sortedChapters.length === 0) {
    return (
      <AppLayout>
        <FullScreenMessageLayout header={header}>
          <EmptyState
            title={t('emptyState.title')}
            description={t('emptyState.description')}
          />
        </FullScreenMessageLayout>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={header}
        contentArea={
          <div className="space-y-3">
            {progress?.academyCompletedAt && (
              <div className="flex items-start gap-2 rounded-lg border bg-muted p-3">
                <Trophy className="h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="font-medium">{t('progress.completed.title')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('progress.completed.description')}
                  </p>
                </div>
              </div>
            )}
            {sortedChapters.map((chapter) => (
              <Item key={chapter.id} variant="outline">
                <Link
                  to="/academy/$chapterId"
                  params={{ chapterId: chapter.id }}
                  className="flex-1"
                >
                  <ItemContent>
                    <ItemTitle className="flex items-center gap-2">
                      {chapter.title}
                      {passedChapterIds.has(chapter.id) && (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          {t('progress.passed')}
                        </Badge>
                      )}
                    </ItemTitle>
                    <ItemDescription>{chapter.description}</ItemDescription>
                  </ItemContent>
                </Link>
              </Item>
            ))}
          </div>
        }
      />
    </AppLayout>
  );
}
