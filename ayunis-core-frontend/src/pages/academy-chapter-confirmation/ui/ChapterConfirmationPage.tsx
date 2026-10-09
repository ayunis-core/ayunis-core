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
import { useConfirmChapter } from '@/pages/academy-chapter-confirmation/api/useConfirmChapter';
import { ChapterConfirmationForm } from './ChapterConfirmationForm';

interface ChapterConfirmationPageProps {
  chapter: AcademyChapterResponseDto;
}

export default function ChapterConfirmationPage({
  chapter,
}: Readonly<ChapterConfirmationPageProps>) {
  const { t } = useTranslation('academy');
  const { confirmChapter, isSubmitting } = useConfirmChapter(chapter.id);

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
              <CardContent>
                <ChapterConfirmationForm
                  isSubmitting={isSubmitting}
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
