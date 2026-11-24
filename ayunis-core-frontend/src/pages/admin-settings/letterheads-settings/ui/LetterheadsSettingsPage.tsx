import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';
import { Pencil, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from '@ayunis/ui/components/item';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Empty, EmptyDescription } from '@ayunis/ui/components/empty';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ayunis/ui/components/alert-dialog';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import { LetterheadFormDialog } from './LetterheadFormDialog';
import { DocumentDefaultsCard } from './DocumentDefaultsCard';
import { useLetterheads } from '@/pages/admin-settings/letterheads-settings/api/useLetterheads';
import { useDeleteLetterhead } from '@/pages/admin-settings/letterheads-settings/api/useDeleteLetterhead';
import type { LetterheadResponseDto } from '@ayunis/api-client/schemas';
import { paginateItems } from '@/shared/lib/paginate-items';
import { PaginationWidget } from '@/widgets/pagination';

const LETTERHEADS_PAGE_SIZE = 10;

interface LetterheadsSettingsPageProps {
  page: number;
  createdLetterheadId?: string;
}

export function LetterheadsSettingsPage({
  page,
  createdLetterheadId,
}: Readonly<LetterheadsSettingsPageProps>) {
  const { t } = useTranslation('admin-settings-letterheads');
  const { letterheads, isLoading, error } = useLetterheads();
  const navigate = useNavigate({ from: '/admin-settings/letterheads/' });
  const createdIndex = letterheads.findIndex(
    ({ id }) => id === createdLetterheadId,
  );
  const createdPage =
    createdIndex === -1
      ? undefined
      : Math.floor(createdIndex / LETTERHEADS_PAGE_SIZE) + 1;
  const { pageItems, currentPage, totalPages } = paginateItems(
    letterheads,
    createdPage ?? page,
    LETTERHEADS_PAGE_SIZE,
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<LetterheadResponseDto | null>(null);

  const { deleteLetterhead, isDeleting } = useDeleteLetterhead(() => {
    setDeleteTarget(null);
  });

  useEffect(() => {
    if (
      !isLoading &&
      !error &&
      (createdPage !== undefined || currentPage !== page)
    ) {
      void navigate({
        search: {
          page: currentPage,
          letterhead:
            createdPage === undefined ? createdLetterheadId : undefined,
        },
        replace: true,
      });
    }
  }, [
    createdLetterheadId,
    createdPage,
    currentPage,
    error,
    isLoading,
    navigate,
    page,
  ]);

  return (
    <SettingsLayout title={t('pageTitle')}>
      <div className="space-y-6">
        <DocumentDefaultsCard />

        <Card>
          <CardHeader>
            <CardTitle>{t('letterheads.title')}</CardTitle>
            <CardAction>
              <Button
                size="sm"
                data-testid="letterheads-create"
                onClick={() => setCreateDialogOpen(true)}
              >
                {t('letterheads.add')}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}
            {!isLoading && letterheads.length === 0 && (
              <Empty>
                <EmptyDescription>{t('letterheads.empty')}</EmptyDescription>
              </Empty>
            )}
            {!isLoading && letterheads.length > 0 && (
              <div className="space-y-3">
                {pageItems.map((lh) => (
                  <Item
                    key={lh.id}
                    variant="outline"
                    data-testid="letterheads-list-item"
                  >
                    <Link
                      to="/admin-settings/letterheads/$id"
                      params={{ id: lh.id }}
                      className="flex-1 cursor-pointer"
                    >
                      <ItemContent>
                        <ItemTitle>{lh.name}</ItemTitle>
                        <ItemDescription>
                          {lh.description ?? t('letterheads.noDescription')}
                        </ItemDescription>
                      </ItemContent>
                    </Link>
                    <ItemActions>
                      <Link
                        to="/admin-settings/letterheads/$id"
                        params={{ id: lh.id }}
                      >
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="destructive-ghost"
                        size="icon"
                        data-testid="letterheads-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(lh);
                        }}
                      >
                        <Trash2 />
                      </Button>
                      <Link
                        to="/admin-settings/letterheads/$id"
                        params={{ id: lh.id }}
                        className="flex items-center"
                      >
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </ItemActions>
                  </Item>
                ))}
                <PaginationWidget
                  currentPage={currentPage}
                  totalPages={totalPages}
                  to="/admin-settings/letterheads"
                  buildSearchParams={(targetPage) => ({ page: targetPage })}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <LetterheadFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={(id) => void navigate({ search: { page, letterhead: id } })}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('letterheads.deleteDialog.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('letterheads.deleteDialog.description', {
                name: deleteTarget?.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('letterheads.deleteDialog.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => {
                if (deleteTarget) deleteLetterhead(deleteTarget.id);
              }}
            >
              {isDeleting
                ? t('letterheads.deleteDialog.deleting')
                : t('letterheads.deleteDialog.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsLayout>
  );
}
