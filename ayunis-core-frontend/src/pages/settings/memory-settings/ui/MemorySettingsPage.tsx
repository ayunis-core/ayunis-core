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
    error,
    refetch,
    isSaving,
    isClearing,
    saveEntry,
    deleteEntry,
    clearMemory,
  } = useUserMemory();

  const hasFailed = error !== null && error !== undefined;
  const isReady = !isLoading && !hasFailed;
  const hasContent = entries.some((entry) => entry.content.length > 0);

  return (
    <SettingsLayout title={t('memory.title')}>
      <div className="space-y-4" data-testid="memory-settings-page">
        <p className="text-muted-foreground text-sm">
          {t('memory.description')}
        </p>

        {isLoading && (
          <>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </>
        )}

        {hasFailed && !isLoading && (
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
              key={entry.key}
              entry={entry}
              isSaving={isSaving}
              onSave={saveEntry}
              onRemove={deleteEntry}
            />
          ))}

        {isReady && hasContent && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsConfirmingClear(true)}
            disabled={isClearing}
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
            <AlertDialogAction onClick={clearMemory}>
              {t('memory.confirmClear.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsLayout>
  );
}
