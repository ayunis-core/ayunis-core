import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { EmptyState } from '@/widgets/empty-state';
import { Button } from '@/shared/ui/shadcn/button';
import type { AcademyChapterResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useChapterQuiz } from '../api/useChapterQuiz';
import { useSubmitChapterQuiz } from '../api/useSubmitChapterQuiz';
import QuizForm from './QuizForm';
import QuizResultCard from './QuizResultCard';

interface ChapterQuizPageProps {
  chapter: AcademyChapterResponseDto;
}

export default function ChapterQuizPage({
  chapter,
}: Readonly<ChapterQuizPageProps>) {
  const { t } = useTranslation('academy');
  const navigate = useNavigate();
  const { questions, isLoading, isError, refetch } = useChapterQuiz(chapter.id);
  const { submitQuiz, isSubmitting, result, reset } = useSubmitChapterQuiz();

  const goToAcademy = () => void navigate({ to: '/academy' });
  const handleRetry = () => {
    reset();
    void refetch();
  };

  const header = (
    <ContentAreaHeader
      breadcrumbs={[
        { label: t('page.title'), href: '/academy' },
        { label: chapter.title, href: `/academy/${chapter.id}` },
        { label: t('quiz.title') },
      ]}
    />
  );

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={header}
        contentArea={
          <div className="pb-8">
            {renderQuizBody({
              isLoading,
              isError,
              questions,
              result,
              isSubmitting,
              onSubmit: (data) => submitQuiz(chapter.id, data),
              onRetry: handleRetry,
              onBackToAcademy: goToAcademy,
              labels: {
                loadError: t('quiz.errors.loadFailed'),
                loadErrorDescription: t('quiz.errors.loadFailedDescription'),
                empty: t('quiz.errors.notAvailable'),
                emptyDescription: t('quiz.errors.notAvailableDescription'),
                retry: t('quiz.retry'),
              },
            })}
          </div>
        }
      />
    </AppLayout>
  );
}

interface QuizBodyArgs {
  isLoading: boolean;
  isError: boolean;
  questions: React.ComponentProps<typeof QuizForm>['questions'];
  result: React.ComponentProps<typeof QuizResultCard>['result'] | undefined;
  isSubmitting: boolean;
  onSubmit: React.ComponentProps<typeof QuizForm>['onSubmit'];
  onRetry: () => void;
  onBackToAcademy: () => void;
  labels: {
    loadError: string;
    loadErrorDescription: string;
    empty: string;
    emptyDescription: string;
    retry: string;
  };
}

function renderQuizBody(args: Readonly<QuizBodyArgs>) {
  if (args.result) {
    return (
      <QuizResultCard
        result={args.result}
        onRetry={args.onRetry}
        onBackToAcademy={args.onBackToAcademy}
      />
    );
  }
  if (args.isLoading) {
    return <p className="text-muted-foreground">…</p>;
  }
  if (args.isError) {
    return (
      <div className="space-y-3">
        <EmptyState
          title={args.labels.loadError}
          description={args.labels.loadErrorDescription}
        />
        <Button variant="outline" onClick={args.onRetry}>
          {args.labels.retry}
        </Button>
      </div>
    );
  }
  if (args.questions.length === 0) {
    return (
      <EmptyState
        title={args.labels.empty}
        description={args.labels.emptyDescription}
      />
    );
  }
  return (
    <QuizForm
      questions={args.questions}
      isSubmitting={args.isSubmitting}
      onSubmit={args.onSubmit}
    />
  );
}
