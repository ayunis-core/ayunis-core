import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { MarginEditor } from '@/widgets/margin-editor';
import { useCreateLetterhead } from '../api/useCreateLetterhead';

interface LetterheadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LetterheadFormDialog({
  open,
  onOpenChange,
}: Readonly<LetterheadFormDialogProps>) {
  const { t } = useTranslation('admin-settings-letterheads');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <LetterheadFormContent
          key={String(open)}
          onOpenChange={onOpenChange}
          t={t}
        />
      )}
    </Dialog>
  );
}

interface LetterheadFormContentProps {
  onOpenChange: (open: boolean) => void;
  t: (key: string) => string;
}

function LetterheadFormContent({
  onOpenChange,
  t,
}: Readonly<LetterheadFormContentProps>) {
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const {
    form,
    onSubmit,
    resetForm,
    isLoading,
    firstPagePdf,
    setFirstPagePdf,
    continuationPagePdf,
    setContinuationPagePdf,
    firstPageMargins,
    setFirstPageMargins,
    continuationPageMargins,
    setContinuationPageMargins,
  } = useCreateLetterhead({ onClose: handleClose });

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
      <Form {...form}>
        <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
          <DialogHeader>
            <DialogTitle>{t('letterheads.createDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('letterheads.createDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('letterheads.createDialog.nameLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t(
                        'letterheads.createDialog.namePlaceholder',
                      )}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('letterheads.createDialog.descriptionLabel')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t(
                        'letterheads.createDialog.descriptionPlaceholder',
                      )}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* First Page PDF */}
            <div className="grid gap-2">
              <Label>{t('letterheads.createDialog.firstPagePdfLabel')}</Label>
              <Input
                type="file"
                accept="application/pdf"
                disabled={isLoading}
                onChange={(e) => setFirstPagePdf(e.target.files?.[0] ?? null)}
              />
            </div>

            {/* First Page Margins */}
            <MarginEditor
              pdfSource={firstPagePdf}
              margins={firstPageMargins}
              onMarginsChange={setFirstPageMargins}
              label={t('letterheads.createDialog.firstPageMarginsLabel')}
            />

            {/* Continuation Page PDF */}
            <div className="grid gap-2">
              <Label>
                {t('letterheads.createDialog.continuationPagePdfLabel')}
              </Label>
              <Input
                type="file"
                accept="application/pdf"
                disabled={isLoading}
                onChange={(e) =>
                  setContinuationPagePdf(e.target.files?.[0] ?? null)
                }
              />
            </div>

            {/* Continuation Page Margins */}
            <MarginEditor
              pdfSource={continuationPagePdf}
              margins={continuationPageMargins}
              onMarginsChange={setContinuationPageMargins}
              label={t('letterheads.createDialog.continuationPageMarginsLabel')}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              {t('letterheads.createDialog.cancel')}
            </Button>
            <Button type="submit" disabled={isLoading || !firstPagePdf}>
              {isLoading
                ? t('letterheads.createDialog.creating')
                : t('letterheads.createDialog.create')}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
