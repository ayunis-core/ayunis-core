import { lazy, Suspense, useState } from 'react';
import { Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ayunis/ui/components/dialog';

const PdfPreviewViewer = lazy(() => import('./PdfPreviewViewer'));

interface ArtifactPdfPreviewProps {
  readonly artifactId: string;
  readonly versionNumber: number;
}

export function ArtifactPdfPreview(props: ArtifactPdfPreviewProps) {
  const { t } = useTranslation('artifacts');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('preview.title')}
          title={t('preview.title')}
          data-testid="artifact-pdf-preview-open"
        >
          <Eye aria-hidden="true" className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent
        size="wide"
        closeLabel={t('navigation.close')}
        className="grid-rows-[auto_minmax(0,1fr)] overflow-hidden"
      >
        <DialogHeader>
          <DialogTitle>{t('preview.title')}</DialogTitle>
          <DialogDescription>{t('preview.savedVersion')}</DialogDescription>
        </DialogHeader>
        {open && (
          <Suspense fallback={<p role="status">{t('preview.loading')}</p>}>
            <PdfPreviewViewer {...props} />
          </Suspense>
        )}
      </DialogContent>
    </Dialog>
  );
}
