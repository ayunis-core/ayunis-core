import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';
import { ItemGroup } from '@ayunis/ui/components/item';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { EmptyState } from '@/widgets/empty-state';
import { ListToolbar } from '@/widgets/list-toolbar';
import { SearchPagination } from '@/widgets/pagination';
import type { ArtifactsControllerFindPersonalType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useLibraryArtifacts } from '@/pages/library/api/useLibraryArtifacts';
import { LIBRARY_PAGE_SIZE } from '@/pages/library/model/constants';
import LibraryArtifactItem from './LibraryArtifactItem';
import LibraryFilters from './LibraryFilters';

interface LibraryPageProps {
  search?: string;
  type?: ArtifactsControllerFindPersonalType;
  page: number;
}

export default function LibraryPage({
  search,
  type,
  page,
}: Readonly<LibraryPageProps>) {
  const { t } = useTranslation('artifacts');
  const { artifacts, total, isLoading, error } = useLibraryArtifacts({
    search,
    type,
    page,
  });

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[{ label: t('library.title') }]}
            action={
              <ListToolbar data-testid="library-toolbar">
                <LibraryFilters search={search} type={type} />
              </ListToolbar>
            }
          />
        }
        contentArea={
          <>
            <LibraryContent
              artifacts={artifacts}
              isLoading={isLoading}
              error={error}
              hasFilters={Boolean(search || type)}
            />
            <SearchPagination
              currentPage={page}
              totalPages={Math.ceil(total / LIBRARY_PAGE_SIZE)}
              to="/library"
              search={search}
              extraSearchParams={{ type }}
            />
          </>
        }
      />
    </AppLayout>
  );
}

function LibraryContent({
  artifacts,
  isLoading,
  error,
  hasFilters,
}: Readonly<
  Pick<
    ReturnType<typeof useLibraryArtifacts>,
    'artifacts' | 'isLoading' | 'error'
  > & { hasFilters: boolean }
>) {
  const { t } = useTranslation('artifacts');
  if (error) {
    return (
      <Alert variant="warning">
        <AlertTriangle />
        <AlertTitle>{t('library.loadError.title')}</AlertTitle>
        <AlertDescription>
          {t('library.loadError.description')}
        </AlertDescription>
      </Alert>
    );
  }
  if (isLoading) return null;
  if (artifacts.length === 0) {
    return (
      <EmptyState
        title={t(hasFilters ? 'library.noResultsTitle' : 'library.emptyTitle')}
        description={t(
          hasFilters
            ? 'library.noResultsDescription'
            : 'library.emptyDescription',
        )}
        testId="library-empty"
      />
    );
  }
  return (
    <ItemGroup className="gap-2" data-testid="library-list">
      {artifacts.map((artifact) => (
        <LibraryArtifactItem key={artifact.id} artifact={artifact} />
      ))}
    </ItemGroup>
  );
}
