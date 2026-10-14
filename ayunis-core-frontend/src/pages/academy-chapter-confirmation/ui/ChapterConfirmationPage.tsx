import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import type { AcademyChapterResponseDto } from '@/shared/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { useAcademyProgress } from '@/features/academy';
import { useConfirmChapter } from '@/pages/academy-chapter-confirmation/api/useConfirmChapter';
import { findModulesBlockingConfirmation } from '@/pages/academy-chapter-confirmation/lib/findModulesBlockingConfirmation';
import { ChapterConfirmationForm } from './ChapterConfirmationForm';

interface ChapterConfirmationPageProps {
  chapter: AcademyChapterResponseDto;
}

export default function ChapterConfirmationPage({
  chapter,
}: Readonly<ChapterConfirmationPageProps>) {
  const { t } = useTranslation('academy');
  const { confirmChapter, isSubmitting } = useConfirmChapter(chapter.id);
  const { progress, isLoading: isLoadingProgress } = useAcademyProgress();
  const shortModules = progress
    ? findModulesBlockingConfirmation(chapter, progress)
    : [];

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: t('page.title'), href: '/academy' },
              { label: chapter.title, href: `/academy/${chapter.id}` },
              { label: t('confirmation.title') },
            ]}
          />
        }
        contentArea={
          <div className="mx-auto max-w-2xl">
            <Card data-testid="academy-confirmation-page">
              <CardHeader>
                <CardTitle>{t('confirmation.title')}</CardTitle>
                <CardDescription>
                  {t('confirmation.description')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {progress && shortModules.length > 0 && (
                  <Alert data-testid="academy-confirmation-short-modules">
                    <AlertDescription>
                      <p>
                        {t('confirmation.minimumTime', {
                          seconds: progress.minimumModuleSeconds,
                        })}
                      </p>
                      <ul className="list-disc pl-5">
                        {shortModules.map((courseModule) => (
                          <li key={courseModule.id}>{courseModule.title}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                <ChapterConfirmationForm
                  isSubmitting={isSubmitting}
                  // The server enforces the minimum too, so a failed progress request
                  // must not lock the learner out; a short chapter answers 409.
                  isBlocked={isLoadingProgress || shortModules.length > 0}
                  onConfirm={() => void confirmChapter()}
                />
              </CardContent>
            </Card>
          </div>
        }
      />
    </AppLayout>
  );
}
