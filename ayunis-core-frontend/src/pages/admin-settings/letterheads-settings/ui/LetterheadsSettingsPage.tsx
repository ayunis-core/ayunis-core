import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import { Card, CardContent } from '@/shared/ui/shadcn/card';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { Empty, EmptyDescription, EmptyTitle } from '@/shared/ui/shadcn/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/shadcn/table';
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
import { Pencil, Trash2 } from 'lucide-react';
import SettingsLayout from '../../admin-settings-layout';
import { LetterheadFormDialog } from './LetterheadFormDialog';
import { useLetterheads } from '../api/useLetterheads';
import { useDeleteLetterhead } from '../api/useDeleteLetterhead';
import type { LetterheadResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

export function LetterheadsSettingsPage() {
  const { t } = useTranslation('admin-settings-letterheads');
  const { letterheads, isLoading } = useLetterheads();
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editLetterhead, setEditLetterhead] =
    useState<LetterheadResponseDto | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<LetterheadResponseDto | null>(null);

  const { deleteLetterhead, isDeleting } = useDeleteLetterhead(() => {
    setDeleteTarget(null);
  });

  const handleEdit = (lh: LetterheadResponseDto) => {
    setEditLetterhead(lh);
    setFormDialogOpen(true);
  };

  const handleCreate = () => {
    setEditLetterhead(null);
    setFormDialogOpen(true);
  };

  const headerActions = (
    <Button size="sm" onClick={handleCreate}>
      {t('letterheads.add')}
    </Button>
  );

  return (
    <SettingsLayout action={headerActions} title={t('letterheads.title')}>
      {isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ) : letterheads.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <Empty>
              <EmptyTitle>{t('letterheads.title')}</EmptyTitle>
              <EmptyDescription>{t('letterheads.empty')}</EmptyDescription>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('letterheads.table.name')}</TableHead>
                  <TableHead>{t('letterheads.table.description')}</TableHead>
                  <TableHead>
                    {t('letterheads.table.continuationPage')}
                  </TableHead>
                  <TableHead className="w-24">
                    {t('letterheads.table.actions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {letterheads.map((lh) => (
                  <TableRow key={lh.id}>
                    <TableCell className="font-medium">{lh.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {lh.description ?? '—'}
                    </TableCell>
                    <TableCell>
                      {lh.hasContinuationPage
                        ? t('letterheads.table.continuationPageYes')
                        : t('letterheads.table.continuationPageNo')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEdit(lh)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive"
                          onClick={() => setDeleteTarget(lh)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <LetterheadFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        letterhead={editLetterhead}
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
