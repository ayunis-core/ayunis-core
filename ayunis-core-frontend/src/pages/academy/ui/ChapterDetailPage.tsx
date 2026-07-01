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
  activeModule?: number;
}

export default function ChapterDetailPage({
  chapter,
  activeModule,
}: Readonly<ChapterDetailPageProps>) {
  const { t } = useTranslation('academy');
  const navigate = useNavigate();

  const modules = [...chapter.courseModules].sort(
    (a, b) => a.position - b.position,
  );

  const goToModule = (index?: number) => {
    void navigate({
      to: '/academy/$chapterId',
      params: { chapterId: chapter.id },
      search: index === undefined ? {} : { module: index },
    });
  };

  const finishChapter = () => {
    if (chapter.quizEnabled) {
      void navigate({
        to: '/academy/$chapterId/quiz',
        params: { chapterId: chapter.id },
      });
      return;
    }
    void navigate({ to: '/academy' });
  };

  const header = (
    <ContentAreaHeader
      breadcrumbs={[
        { label: t('page.title'), href: '/academy' },
        { label: chapter.title },
      ]}
    />
  );

  // Intro screen: shown when there is no active module or the index is out of range.
  const showIntro =
    activeModule === undefined ||
    activeModule < 0 ||
    activeModule >= modules.length;

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
                {modules.length === 0 ? (
                  <EmptyState
                    title={t('detail.noModules.title')}
                    description={t('detail.noModules.description')}
                  />
                ) : (
                  <Button onClick={() => goToModule(0)}>
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

  const currentIndex = activeModule;
  const currentModule = modules[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === modules.length - 1;

  const moduleView = (
    <div className="space-y-4">
      {/* Full-width video */}
      <div className="aspect-video overflow-hidden rounded-lg border bg-muted">
        <iframe
          key={currentModule.id}
          src={toLoomEmbedUrl(currentModule.loomUrl)}
          title={currentModule.title}
          className="h-full w-full"
          allowFullScreen
          allow="autoplay; fullscreen; picture-in-picture"
        />
      </div>

      {/* Constrained text region: title, description, navigation, module list */}
      <div className="mx-auto max-w-[800px] space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{currentModule.title}</h2>
          {currentModule.description && (
            <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
              {currentModule.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => goToModule(isFirst ? undefined : currentIndex - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            {t('detail.previous')}
          </Button>
          {isLast ? (
            <Button onClick={finishChapter}>
              {chapter.quizEnabled ? t('detail.startQuiz') : t('detail.finish')}
              <Check className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => goToModule(currentIndex + 1)}>
              {t('detail.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Module title list */}
        <nav>
          <p className="mb-2 px-2 text-sm font-medium text-muted-foreground">
            {t('detail.modulesTitle')}
          </p>
          <ul className="space-y-1">
            {modules.map((module, index) => (
              <li key={module.id}>
                <Button
                  variant={index === currentIndex ? 'secondary' : 'ghost'}
                  onClick={() => goToModule(index)}
                  className="w-full justify-start gap-2 text-left"
                >
                  <span className="text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <span className="truncate">{module.title}</span>
                </Button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={header}
        contentArea={moduleView}
        fullWidth
      />
    </AppLayout>
  );
}
