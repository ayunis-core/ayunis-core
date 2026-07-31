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
import { CheckCircle2, Download, RotateCcw, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import {
  AcademyGateNotice,
  useAcademyAccessStatus,
  useDownloadCertificate,
} from '@/features/academy';
import type { AcademyChapterResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { AcademyAccessMode } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useAcademyProgress } from '../api/useAcademyProgress';

interface AcademyPageProps {
  chapters: AcademyChapterResponseDto[];
}

export default function AcademyPage({ chapters }: Readonly<AcademyPageProps>) {
  const { t } = useTranslation('academy');
  const { progress } = useAcademyProgress();
  const { downloadCertificate, isDownloading } = useDownloadCertificate();
  const { isGated, status } = useAcademyAccessStatus();

  // Passes age out of the certificate's validity period platform-wide, but only
  // an org on annual renewal actually has to redo anything. Surfacing expiry
  // anywhere else would nag people about an obligation their org never set.
  const renewalRequired = status?.mode === AcademyAccessMode.required_annually;

  const chapterProgress = progress?.chapters ?? [];
  // `passed` stays true forever; `passValid` is what still counts toward the
  // certificate, so an expired pass reads as "redo this" rather than "done".
  const passedChapterIds = new Set(
    chapterProgress
      .filter((c) => (renewalRequired ? c.passValid : c.passed))
      .map((c) => c.chapterId),
  );
  const expiredChapterIds = new Set(
    renewalRequired
      ? chapterProgress
          .filter((c) => c.passed && !c.passValid)
          .map((c) => c.chapterId)
      : [],
  );

  // A lapsed completion in an annual org must not still read as "Academy
  // complete!" right below the notice telling them chat is locked. In that mode
  // `allowed` is precisely "holds a non-expired certificate", so lean on the
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
