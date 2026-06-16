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
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import type { AcademyChapterResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface AcademyPageProps {
  chapters: AcademyChapterResponseDto[];
}

export default function AcademyPage({ chapters }: Readonly<AcademyPageProps>) {
  const { t } = useTranslation('academy');

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
            {sortedChapters.map((chapter) => (
              <Item key={chapter.id} variant="outline">
                <Link
                  to="/academy/$chapterId"
                  params={{ chapterId: chapter.id }}
                  className="flex-1"
                >
                  <ItemContent>
                    <ItemTitle>{chapter.title}</ItemTitle>
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
