import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { EmptyState } from '@/widgets/empty-state';
import {
  getChapterModuleProgress,
  useAcademyAccessStatus,
  useAcademyProgress,
} from '@/features/academy';
import type { AcademyChapterResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { AcademyAccessMode } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { ModuleVideo } from './ModuleVideo';
import { ChapterModuleList } from './ChapterModuleList';
import { useProgressWhileWatching } from '@/pages/academy-chapter/lib/useProgressWhileWatching';

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
  const { progress } = useAcademyProgress();
  const { status } = useAcademyAccessStatus();
  const chapterProgress = progress?.chapters.find(
    ({ chapterId }) => chapterId === chapter.id,
  );
  const confirmed =
    status?.mode === AcademyAccessMode.required_annually
      ? Boolean(chapterProgress?.confirmationValid)
      : Boolean(chapterProgress?.confirmed);
  const liveModuleProgress = getChapterModuleProgress(
    chapter,
    progress,
    confirmed,
  );
  const modules = liveModuleProgress.modules.map(
    ({ courseModule }) => courseModule,
  );
  const moduleProgress = useProgressWhileWatching(
    liveModuleProgress,
    activeModule === undefined ? undefined : modules.at(activeModule)?.id,
    progress !== undefined,
  );

  const goToModule = (index: number) => {
    void navigate({
      to: '/academy/$chapterId',
      params: { chapterId: chapter.id },
      search: { module: index },
    });
  };

  const goToOverview = () => {
    void navigate({ to: '/academy' });
  };

  const openConfirmation = () => {
    void navigate({
      to: '/academy/$chapterId/complete',
      params: { chapterId: chapter.id },
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

  const currentModule =
    activeModule === undefined ? undefined : modules.at(activeModule);

  if (activeModule === undefined || !currentModule) {
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
              <CardContent className="space-y-3">
                <EmptyState
                  title={t('detail.noModules.title')}
                  description={t('detail.noModules.description')}
                />
                <Button
                  onClick={openConfirmation}
                  data-testid="academy-chapter-complete-action"
                >
                  {t('detail.openConfirmation')}
                </Button>
              </CardContent>
            </Card>
          }
        />
      </AppLayout>
    );
  }

  const currentIndex = activeModule;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === modules.length - 1;

  const moduleList = (
    <ChapterModuleList
      moduleProgress={moduleProgress}
      currentIndex={currentIndex}
      onSelectModule={goToModule}
    />
  );

  const moduleView = (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 lg:flex-row lg:items-start">
      {/* Main column: video capped so the page stays scannable, plus text/nav */}
      <div className="min-w-0 flex-1 space-y-4">
        <ModuleVideo courseModule={currentModule} />

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
            onClick={() =>
              isFirst ? goToOverview() : goToModule(currentIndex - 1)
            }
            data-testid="academy-module-previous"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('detail.previous')}
          </Button>
          {isLast && !confirmed && moduleProgress.allComplete && (
            <Button
              onClick={openConfirmation}
              data-testid="academy-chapter-complete-action"
            >
              {t('detail.openConfirmation')}
              <Check className="h-4 w-4" />
            </Button>
          )}
          {!isLast && (
            <Button
              onClick={() => goToModule(currentIndex + 1)}
              data-testid="academy-module-next"
            >
              {t('detail.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Side panel: module list, stacks below the video on small screens */}
      <aside className="lg:w-72 lg:shrink-0">{moduleList}</aside>
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
