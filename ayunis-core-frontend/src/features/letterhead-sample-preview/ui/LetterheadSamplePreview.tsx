import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ayunis/ui/components/dialog';
import type { LetterheadSampleDraft } from '@/features/letterhead-sample-preview/model/letterhead-sample-draft';

const LetterheadSamplePages = lazy(() => import('./LetterheadSamplePages'));

interface LetterheadSamplePreviewProps {
  draft: LetterheadSampleDraft;
  disabled?: boolean;
}

export function LetterheadSamplePreview({
  draft,
  disabled,
}: Readonly<LetterheadSamplePreviewProps>) {
  const { t } = useTranslation('admin-settings-letterheads');
  const [previewDraft, setPreviewDraft] =
    useState<LetterheadSampleDraft | null>(null);

  return (
    <Dialog
      open={previewDraft !== null}
      onOpenChange={(open) => setPreviewDraft(open ? draft : null)}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || (!draft.firstPagePdf && !draft.letterheadId)}
          data-testid="letterhead-sample-preview-open"
        >
          <Eye aria-hidden="true" />
          {t('letterheads.samplePreview.open')}
        </Button>
      </DialogTrigger>
      <DialogContent
        size="wide"
        closeLabel={t('letterheads.samplePreview.close')}
        className="grid-rows-[auto_minmax(0,1fr)] overflow-hidden"
      >
        <DialogHeader>
          <DialogTitle>{t('letterheads.samplePreview.open')}</DialogTitle>
          <DialogDescription>
            {t('letterheads.samplePreview.description')}
          </DialogDescription>
        </DialogHeader>
        {previewDraft && (
          <Suspense
            fallback={
              <p role="status">{t('letterheads.samplePreview.loading')}</p>
            }
          >
            <LetterheadSamplePages draft={previewDraft} />
          </Suspense>
        )}
      </DialogContent>
    </Dialog>
  );
}
