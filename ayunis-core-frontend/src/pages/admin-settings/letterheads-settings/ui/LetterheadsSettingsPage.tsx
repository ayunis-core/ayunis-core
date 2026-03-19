import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { Pencil, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from '@/shared/ui/shadcn/item';
import { Empty, EmptyDescription, EmptyTitle } from '@/shared/ui/shadcn/empty';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/shadcn/alert-dialog';
import SettingsLayout from '../../admin-settings-layout';
import { LetterheadFormDialog } from './LetterheadFormDialog';
import { useLetterheads } from '../api/useLetterheads';
import { useDeleteLetterhead } from '../api/useDeleteLetterhead';
import type { LetterheadResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function LetterheadsSettingsPage() {
  const { t } = useTranslation('admin-settings-letterheads');
  const { letterheads, isLoading } = useLetterheads();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<LetterheadResponseDto | null>(null);

  const { deleteLetterhead, isDeleting } = useDeleteLetterhead(() => {
    setDeleteTarget(null);
  });

  const headerActions = (
    <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
      {t('letterheads.add')}
    </Button>
  );

  return (
    <SettingsLayout action={headerActions} title={t('letterheads.title')}>
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}
      {!isLoading && letterheads.length === 0 && (
        <Empty>
          <EmptyTitle>{t('letterheads.title')}</EmptyTitle>
          <EmptyDescription>{t('letterheads.empty')}</EmptyDescription>
        </Empty>
      )}
      {!isLoading && letterheads.length > 0 && (
        <div className="space-y-3">
          {letterheads.map((lh) => (
            <Item key={lh.id} variant="outline">
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
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(lh);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
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
        </div>
      )}

      <LetterheadFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
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
