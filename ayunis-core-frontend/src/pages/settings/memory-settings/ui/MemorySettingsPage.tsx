import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { Button } from '@ayunis/ui/components/button';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { SettingsLayout } from '@/pages/settings/settings-layout';
import { useUserMemory } from '@/pages/settings/memory-settings/api/useUserMemory';
import { MemoryEntryCard } from './MemoryEntryCard';

export default function MemorySettingsPage() {
  const { t } = useTranslation('settings');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const {
    entries,
    isLoading,
    hasLoadFailed,
    refetch,
    isSaving,
    isClearing,
    clearCount,
    saveEntry,
    deleteEntry,
    clearMemory,
  } = useUserMemory();

  const isReady = !isLoading && !hasLoadFailed;
  const hasContent = entries.some((entry) => entry.content.length > 0);

  return (
    <SettingsLayout title={t('memory.title')}>
      <div className="space-y-4" data-testid="memory-settings-page">
        {isLoading && (
          <>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </>
        )}

        {hasLoadFailed && !isLoading && (
          <div className="space-y-2">
            <p className="text-sm">{t('memory.loadError')}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {t('memory.retry')}
            </Button>
          </div>
        )}

        {isReady &&
          entries.map((entry) => (
            <MemoryEntryCard
              // Remounting drops an open draft once its entry changes or all
              // memory is deleted; an already-empty entry keeps its updatedAt.
              key={`${entry.key}:${entry.updatedAt ?? 'empty'}:${clearCount}`}
              entry={entry}
              isSaving={isSaving || isClearing}
              onSave={saveEntry}
              onRemove={deleteEntry}
            />
          ))}

        {isReady && hasContent && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsConfirmingClear(true)}
            disabled={isSaving || isClearing}
          >
            {t('memory.clearAll')}
          </Button>
        )}
      </div>

      <AlertDialog open={isConfirmingClear} onOpenChange={setIsConfirmingClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('memory.confirmClear.title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('memory.confirmClear.body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('memory.confirmClear.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={clearMemory}
              disabled={isSaving || isClearing}
            >
              {t('memory.confirmClear.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsLayout>
  );
}
