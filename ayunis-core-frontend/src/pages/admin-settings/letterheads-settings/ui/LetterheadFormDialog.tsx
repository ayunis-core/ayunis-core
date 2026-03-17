import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { MarginEditor } from './MarginEditor';
import { useCreateLetterhead } from '../api/useCreateLetterhead';
import { useUpdateLetterhead } from '../api/useUpdateLetterhead';
import type { PageMargins } from '../model/types';
import { DEFAULT_MARGINS } from '../model/types';
import type { LetterheadResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface LetterheadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letterhead?: LetterheadResponseDto | null;
}

interface FormFields {
  name: string;
  description: string;
}

export function LetterheadFormDialog({
  open,
  onOpenChange,
  letterhead,
}: Readonly<LetterheadFormDialogProps>) {
  const { t } = useTranslation('admin-settings-letterheads');
  const isEdit = !!letterhead;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <LetterheadFormContent
          key={`${letterhead?.id ?? 'new'}-${String(open)}`}
          letterhead={letterhead}
          isEdit={isEdit}
          onOpenChange={onOpenChange}
          t={t}
        />
      )}
    </Dialog>
  );
}

interface LetterheadFormContentProps {
  letterhead?: LetterheadResponseDto | null;
  isEdit: boolean;
  onOpenChange: (open: boolean) => void;
  t: (key: string) => string;
}

function LetterheadFormContent({
  letterhead,
  isEdit,
  onOpenChange,
  t,
}: Readonly<LetterheadFormContentProps>) {
  const initialMargins = useMemo(
    () => ({
      firstPage: letterhead?.firstPageMargins ?? DEFAULT_MARGINS,
      continuationPage: letterhead?.continuationPageMargins ?? DEFAULT_MARGINS,
    }),
    [letterhead],
  );

  const [firstPagePdf, setFirstPagePdf] = useState<File | null>(null);
  const [continuationPagePdf, setContinuationPagePdf] = useState<File | null>(
    null,
  );
  const [firstPageMargins, setFirstPageMargins] = useState<PageMargins>(
    initialMargins.firstPage,
  );
  const [continuationPageMargins, setContinuationPageMargins] =
    useState<PageMargins>(initialMargins.continuationPage);
  const [removeContinuation, setRemoveContinuation] = useState(false);

  const { createLetterhead, isCreating } = useCreateLetterhead(() => {
    onOpenChange(false);
  });
  const { updateLetterhead, isUpdating } = useUpdateLetterhead(() => {
    onOpenChange(false);
  });

  const isBusy = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormFields>({
    defaultValues: {
      name: letterhead?.name ?? '',
      description: letterhead?.description ?? '',
    },
  });

  const onSubmit = (data: FormFields) => {
    if (isEdit && letterhead) {
      updateLetterhead({
        id: letterhead.id,
        name: data.name,
        description: data.description ?? undefined,
        firstPagePdf: firstPagePdf ?? undefined,
        continuationPagePdf: continuationPagePdf ?? undefined,
        firstPageMargins,
        continuationPageMargins,
        removeContinuationPage:
          removeContinuation && !continuationPagePdf ? true : undefined,
      });
    } else {
      if (!firstPagePdf) return;
      createLetterhead({
        name: data.name,
        description: data.description ?? undefined,
        firstPagePdf,
        continuationPagePdf: continuationPagePdf ?? undefined,
        firstPageMargins,
        continuationPageMargins,
      });
    }
  };

  const dialogTitle = isEdit
    ? t('letterheads.editDialog.title')
    : t('letterheads.createDialog.title');
  const dialogDescription = isEdit
    ? t('letterheads.editDialog.description')
    : t('letterheads.createDialog.description');

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)}>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="lh-name">
              {t('letterheads.createDialog.nameLabel')}
            </Label>
            <Input
              id="lh-name"
              placeholder={t('letterheads.createDialog.namePlaceholder')}
              {...register('name', {
                required: t('letterheads.createDialog.nameRequired'),
              })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="lh-description">
              {t('letterheads.createDialog.descriptionLabel')}
            </Label>
            <Input
              id="lh-description"
              placeholder={t('letterheads.createDialog.descriptionPlaceholder')}
              {...register('description')}
            />
          </div>

          {/* First Page PDF */}
          <div className="grid gap-2">
            <Label>{t('letterheads.createDialog.firstPagePdfLabel')}</Label>
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFirstPagePdf(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* First Page Margins */}
          <MarginEditor
            pdfFile={firstPagePdf}
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
              onChange={(e) =>
                setContinuationPagePdf(e.target.files?.[0] ?? null)
              }
            />
            {isEdit && letterhead?.hasContinuationPage && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={removeContinuation}
                  onCheckedChange={(checked) =>
                    setRemoveContinuation(checked === true)
                  }
                />
                {t('letterheads.editDialog.removeContinuationPage')}
              </label>
            )}
          </div>

          {/* Continuation Page Margins */}
          <MarginEditor
            pdfFile={continuationPagePdf}
            margins={continuationPageMargins}
            onMarginsChange={setContinuationPageMargins}
            label={t('letterheads.createDialog.continuationPageMarginsLabel')}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('letterheads.createDialog.cancel')}
          </Button>
          <Button type="submit" disabled={isBusy || (!isEdit && !firstPagePdf)}>
            {isEdit
              ? isBusy
                ? t('letterheads.editDialog.saving')
                : t('letterheads.editDialog.save')
              : isBusy
                ? t('letterheads.createDialog.creating')
                : t('letterheads.createDialog.create')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
