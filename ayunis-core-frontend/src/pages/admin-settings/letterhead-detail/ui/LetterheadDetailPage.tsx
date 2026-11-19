import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Input } from '@ayunis/ui/components/input';
import { Label } from '@ayunis/ui/components/label';
import { Switch } from '@ayunis/ui/components/switch';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { LetterheadSamplePreview } from '@/features/letterhead-sample-preview';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout';
import { MarginEditor, useDinLetterPresets } from '@/widgets/margin-editor';
import type { PdfSource } from '@/widgets/margin-editor';
import { useUpdateLetterhead } from '@/pages/admin-settings/letterhead-detail/api/useUpdateLetterhead';
import type { PageMargins } from '@/shared/lib/letterhead-margins';
import type { LetterheadResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  buildPdfUrl,
  getContinuationPageSource,
} from '@/pages/admin-settings/letterhead-detail/lib/pdf-source';
import type { LetterheadFormFields } from '@/pages/admin-settings/letterhead-detail/model/types';

import { DocumentTypographyFields } from '@/shared/ui/document-typography-fields';
import type { DocumentTypography } from '@/shared/lib/document-typography';

interface LetterheadDetailPageProps {
  letterhead: LetterheadResponseDto;
}

export function LetterheadDetailPage({
  letterhead,
}: Readonly<LetterheadDetailPageProps>) {
  const { t } = useTranslation('admin-settings-letterheads');
  const dinLetterPresets = useDinLetterPresets();

  const initialMargins = useMemo(
    () => ({
      firstPage: letterhead.firstPageMargins,
      continuationPage: letterhead.continuationPageMargins,
    }),
    [letterhead],
  );

  const [typography, setTypography] = useState<Partial<DocumentTypography>>({});
  const [firstPagePdf, setFirstPagePdf] = useState<File | null>(null);
  const [useDifferentFollowingPages, setUseDifferentFollowingPages] = useState(
    letterhead.hasContinuationPage,
  );
  const [continuationPagePdf, setContinuationPagePdf] = useState<File | null>(
    null,
  );
  const [firstPageMargins, setFirstPageMargins] = useState<PageMargins>(
    initialMargins.firstPage,
  );
  const [continuationPageMargins, setContinuationPageMargins] =
    useState<PageMargins>(initialMargins.continuationPage);

  const { updateLetterhead, isUpdating } = useUpdateLetterhead(() =>
    setTypography({}),
  );

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

  const shouldRemoveContinuation =
    !useDifferentFollowingPages && letterhead.hasContinuationPage;

  const draft = {
    ...typography,
    letterheadId: letterhead.id,
    firstPagePdf: firstPagePdf ?? undefined,
    continuationPagePdf:
      useDifferentFollowingPages && continuationPagePdf
        ? continuationPagePdf
        : undefined,
    firstPageMargins,
    continuationPageMargins: useDifferentFollowingPages
      ? continuationPageMargins
      : firstPageMargins,
    removeContinuationPage: shouldRemoveContinuation || undefined,
  };

  const onSubmit = (data: LetterheadFormFields) => {
    updateLetterhead({ ...draft, ...data, id: letterhead.id });
  };

  // Use newly selected file if available, otherwise fall back to the existing PDF URL
  const firstPageSource: PdfSource =
    firstPagePdf ?? buildPdfUrl(letterhead.id, 'first');

  const continuationPageSource: PdfSource = getContinuationPageSource(
    continuationPagePdf,
    letterhead,
    !useDifferentFollowingPages,
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
            <DocumentTypographyFields
              scope="letterhead"
              value={{
                fontFamily: letterhead.fontFamily ?? null,
                fontSizePt: letterhead.fontSizePt ?? null,
                ...typography,
              }}
              onChange={(patch) =>
                setTypography((previous) => ({ ...previous, ...patch }))
              }
              disabled={isUpdating}
            />
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
                data-testid="letterhead-first-page-file"
                onChange={(e) => setFirstPagePdf(e.target.files?.[0] ?? null)}
              />
            </div>

            <MarginEditor
              pdfSource={firstPageSource}
              margins={firstPageMargins}
              onMarginsChange={setFirstPageMargins}
              label={t('letterheads.createDialog.firstPageMarginsLabel')}
              presets={dinLetterPresets}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('letterheads.detail.followingPages')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                id="use-different-following"
                checked={useDifferentFollowingPages}
                onCheckedChange={setUseDifferentFollowingPages}
              />
              <Label htmlFor="use-different-following">
                {t('letterheads.editDialog.useDifferentFollowingPages')}
              </Label>
            </div>

            {useDifferentFollowingPages && (
              <>
                <div className="grid gap-2">
                  <Label>
                    {t('letterheads.createDialog.followingPagesPdfLabel')}
                  </Label>
                  <Input
                    type="file"
                    accept="application/pdf"
                    data-testid="letterhead-continuation-page-file"
                    onChange={(e) =>
                      setContinuationPagePdf(e.target.files?.[0] ?? null)
                    }
                  />
                </div>

                <MarginEditor
                  pdfSource={continuationPageSource}
                  margins={continuationPageMargins}
                  onMarginsChange={setContinuationPageMargins}
                  label={t(
                    'letterheads.createDialog.followingPagesMarginsLabel',
                  )}
                />
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <LetterheadSamplePreview draft={draft} disabled={isUpdating} />
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
