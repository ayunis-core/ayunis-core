import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { EmptyState } from '@/widgets/empty-state';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import type { AcademyChapterResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { toLoomEmbedUrl } from '../lib/toLoomEmbedUrl';

interface ChapterDetailPageProps {
  chapter: AcademyChapterResponseDto;
  activeLesson?: number;
}

export default function ChapterDetailPage({
  chapter,
  activeLesson,
}: Readonly<ChapterDetailPageProps>) {
  const { t } = useTranslation('academy');
  const navigate = useNavigate();

  const lessons = [...chapter.lessons].sort((a, b) => a.position - b.position);

  const goToLesson = (index?: number) => {
    void navigate({
      to: '/academy/$chapterId',
      params: { chapterId: chapter.id },
      search: index === undefined ? {} : { lesson: index },
    });
  };

  const header = (
    <ContentAreaHeader
      breadcrumbs={[
        { label: t('page.title'), href: '/academy' },
        { label: chapter.title },
      ]}
    />
  );

  // Intro screen: shown when there is no active lesson or the index is out of range.
  const showIntro =
    activeLesson === undefined ||
    activeLesson < 0 ||
    activeLesson >= lessons.length;

  if (showIntro) {
    return (
      <AppLayout>
        <ContentAreaLayout
          contentHeader={header}
          contentArea={
            <Card>
              <CardHeader>
                <CardTitle>{chapter.title}</CardTitle>
                <CardDescription className="whitespace-pre-line">
                  {chapter.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {lessons.length === 0 ? (
                  <EmptyState
                    title={t('detail.noLessons.title')}
                    description={t('detail.noLessons.description')}
                  />
                ) : (
                  <Button onClick={() => goToLesson(0)}>
                    {t('detail.letsGo')}
                  </Button>
                )}
              </CardContent>
            </Card>
          }
        />
      </AppLayout>
    );
  }

  const currentIndex = activeLesson;
  const currentLesson = lessons[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === lessons.length - 1;

  const lessonView = (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Main column: video + navigation */}
      <div className="flex-1 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{currentLesson.title}</h2>
          {currentLesson.description && (
            <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
              {currentLesson.description}
            </p>
          )}
        </div>
        <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
          <iframe
            key={currentLesson.id}
            src={toLoomEmbedUrl(currentLesson.loomUrl)}
            title={currentLesson.title}
            className="h-full w-full"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture"
          />
        </div>
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => goToLesson(isFirst ? undefined : currentIndex - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            {t('detail.previous')}
          </Button>
          {isLast ? (
            <Button onClick={() => void navigate({ to: '/academy' })}>
              {t('detail.finish')}
              <Check className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => goToLesson(currentIndex + 1)}>
              {t('detail.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Side column: lesson title list */}
      <nav className="lg:w-56 lg:flex-shrink-0">
        <p className="mb-2 px-2 text-sm font-medium text-muted-foreground">
          {t('detail.lessonsTitle')}
        </p>
        <ul className="space-y-1">
          {lessons.map((lesson, index) => (
            <li key={lesson.id}>
              <Button
                variant={index === currentIndex ? 'secondary' : 'ghost'}
                onClick={() => goToLesson(index)}
                className="w-full justify-start gap-2 text-left"
              >
                <span className="text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <span className="truncate">{lesson.title}</span>
              </Button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );

  return (
    <AppLayout>
      <ContentAreaLayout contentHeader={header} contentArea={lessonView} />
    </AppLayout>
  );
}
