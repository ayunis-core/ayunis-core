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
} from '@ayunis/ui/components/item';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { CheckCircle2, Download, RotateCcw, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import {
  useAcademyAccessStatus,
  useAcademyProgress,
  useDownloadParticipationConfirmation,
} from '@/features/academy';
import { AcademyGateNotice } from '@/widgets/academy-gate-notice';
import type { AcademyChapterResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { AcademyAccessMode } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface AcademyPageProps {
  chapters: AcademyChapterResponseDto[];
}

export default function AcademyPage({ chapters }: Readonly<AcademyPageProps>) {
  const { t } = useTranslation('academy');
  const { progress } = useAcademyProgress();
  const { downloadParticipationConfirmation, isDownloading } =
    useDownloadParticipationConfirmation();
  const { isGated, status } = useAcademyAccessStatus();

  // Confirmations age out platform-wide, but only an org on annual renewal has
  // to repeat them. Other modes should not show an irrelevant renewal warning.
  const renewalRequired = status?.mode === AcademyAccessMode.required_annually;

  const chapterProgress = progress?.chapters ?? [];
  const confirmedChapterIds = new Set(
    chapterProgress
      .filter(({ confirmed, confirmationValid }) =>
        renewalRequired ? confirmationValid : confirmed,
      )
      .map(({ chapterId }) => chapterId),
  );
  const expiredChapterIds = new Set(
    renewalRequired
      ? chapterProgress
          .filter(
            ({ confirmed, confirmationValid }) =>
              confirmed && !confirmationValid,
          )
          .map(({ chapterId }) => chapterId)
      : [],
  );

  // A lapsed completion in an annual org must not still read as "Academy
  // complete!" right below the notice telling them chat is locked. In that mode
  // `allowed` is precisely "holds a valid completion", so lean on the
  // server's answer rather than re-deriving expiry against the client clock.
  const showCompletion =
    Boolean(progress?.academyCompletedAt) &&
    (!renewalRequired || status.allowed);

  const sortedChapters = [...chapters].sort((a, b) => a.position - b.position);

  const header = (
    <ContentAreaHeader breadcrumbs={[{ label: t('page.title') }]} />
  );

  if (sortedChapters.length === 0) {
    return (
      <AppLayout>
        <FullScreenMessageLayout header={header}>
          <EmptyState
            title={isGated ? t('gate.emptyTitle') : t('emptyState.title')}
            description={
              isGated ? t('gate.emptyDescription') : t('emptyState.description')
            }
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
            <AcademyGateNotice withAction={false} />
            {showCompletion && (
              <Item variant="muted" data-testid="academy-completed">
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
                    onClick={() => void downloadParticipationConfirmation()}
                    disabled={isDownloading}
                  >
                    <Download className="h-4 w-4" />
                    {t('participationConfirmation.download')}
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
                  data-testid={`academy-chapter-${chapter.id}`}
                >
                  <ItemContent>
                    <ItemTitle className="flex items-center gap-2">
                      {chapter.title}
                      {confirmedChapterIds.has(chapter.id) && (
                        <Badge
                          variant="secondary"
                          className="gap-1"
                          data-testid={`academy-chapter-confirmed-${chapter.id}`}
                        >
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          {t('progress.confirmed')}
                        </Badge>
                      )}
                      {expiredChapterIds.has(chapter.id) && (
                        <Badge variant="outline" className="gap-1">
                          <RotateCcw className="h-3 w-3" />
                          {t('progress.renewalDue')}
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
