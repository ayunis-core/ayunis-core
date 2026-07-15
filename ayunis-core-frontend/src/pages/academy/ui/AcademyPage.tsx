import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import FullScreenMessageLayout from '@/layouts/full-screen-message-layout/ui/FullScreenMessageLayout';
import { EmptyState } from '@/widgets/empty-state';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/shadcn/button';
import { CheckCircle2, Download, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useDownloadCertificate } from '@/features/academy';
import type { AcademyChapterResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useAcademyProgress } from '../api/useAcademyProgress';

interface AcademyPageProps {
  chapters: AcademyChapterResponseDto[];
}

export default function AcademyPage({ chapters }: Readonly<AcademyPageProps>) {
  const { t } = useTranslation('academy');
  const { progress } = useAcademyProgress();
  const { downloadCertificate, isDownloading } = useDownloadCertificate();

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
              <Item variant="muted">
                <ItemMedia variant="icon" className="text-brand">
                  <Trophy />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{t('progress.completed.title')}</ItemTitle>
                  <ItemDescription>
                    {t('progress.completed.description')}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Button
                    onClick={() => void downloadCertificate()}
                    disabled={isDownloading}
                  >
                    <Download className="h-4 w-4" />
                    {t('certificate.download')}
                  </Button>
                </ItemActions>
              </Item>
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
