import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import SettingsLayout from '../../admin-settings-layout';
import { MarginEditor } from '@/widgets/margin-editor';
import type { PdfSource } from '@/widgets/margin-editor';
import { useUpdateLetterhead } from '../api/useUpdateLetterhead';
import type { PageMargins } from '@/shared/lib/letterhead-margins';
import type { LetterheadResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { buildPdfUrl, getContinuationPageSource } from '../lib/pdf-source';
import type { LetterheadFormFields } from '../model/types';

interface LetterheadDetailPageProps {
  letterhead: LetterheadResponseDto;
}

export function LetterheadDetailPage({
  letterhead,
}: Readonly<LetterheadDetailPageProps>) {
  const { t } = useTranslation('admin-settings-letterheads');

  const initialMargins = useMemo(
    () => ({
      firstPage: letterhead.firstPageMargins,
      continuationPage: letterhead.continuationPageMargins,
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

  const { updateLetterhead, isUpdating } = useUpdateLetterhead();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LetterheadFormFields>({
    defaultValues: {
      name: letterhead.name,
      description: letterhead.description ?? '',
    },
  });

  const onSubmit = (data: LetterheadFormFields) => {
    updateLetterhead({
      id: letterhead.id,
      name: data.name,
      description: data.description,
      firstPagePdf: firstPagePdf ?? undefined,
      continuationPagePdf: continuationPagePdf ?? undefined,
      firstPageMargins,
      continuationPageMargins,
      removeContinuationPage:
        removeContinuation && !continuationPagePdf ? true : undefined,
    });
  };

  // Use newly selected file if available, otherwise fall back to the existing PDF URL
  const firstPageSource: PdfSource =
    firstPagePdf ?? buildPdfUrl(letterhead.id, 'first');

  const continuationPageSource: PdfSource = getContinuationPageSource(
    continuationPagePdf,
    letterhead,
    removeContinuation,
  );

  return (
    <SettingsLayout title={letterhead.name}>
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('letterheads.detail.general')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lh-description">
                {t('letterheads.createDialog.descriptionLabel')}
              </Label>
              <Input
                id="lh-description"
                placeholder={t(
                  'letterheads.createDialog.descriptionPlaceholder',
                )}
                {...register('description')}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('letterheads.detail.firstPage')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>{t('letterheads.createDialog.firstPagePdfLabel')}</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFirstPagePdf(e.target.files?.[0] ?? null)}
              />
            </div>

            <MarginEditor
              pdfSource={firstPageSource}
              margins={firstPageMargins}
              onMarginsChange={setFirstPageMargins}
              label={t('letterheads.createDialog.firstPageMarginsLabel')}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('letterheads.detail.continuationPage')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              {letterhead.hasContinuationPage && (
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

            <MarginEditor
              pdfSource={continuationPageSource}
              margins={continuationPageMargins}
              onMarginsChange={setContinuationPageMargins}
              label={t('letterheads.createDialog.continuationPageMarginsLabel')}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isUpdating}>
            {isUpdating
              ? t('letterheads.editDialog.saving')
              : t('letterheads.editDialog.save')}
          </Button>
        </div>
      </form>
    </SettingsLayout>
  );
}
