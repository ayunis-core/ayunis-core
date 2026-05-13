import { useEffect, useState } from 'react';
import { useForm, useWatch, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout/ui/AdminSettingsLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';
import { Button } from '@/shared/ui/shadcn/button';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import config from '@/shared/config';
import { useBranding } from '@/features/useBranding';
import { useUpdateBranding } from '../api/useUpdateBranding';
import { LogoUploadField } from './LogoUploadField';
import { BrandColorField } from './BrandColorField';
import { SidebarPreview } from './SidebarPreview';
import { bestForegroundContrast, isValidHex } from '../lib/color-utils';
import { extractLogoColors } from '../lib/extract-logo-colors';

// Display name may be empty — clearing it falls back to the platform default.
const formSchema = z.object({
  displayName: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface SaveButtonProps {
  control: Control<FormValues>;
  originalDisplayName: string;
  hasNewFavicon: boolean;
  removeFavicon: boolean;
  colorDirty: boolean;
  colorValid: boolean;
  isUpdating: boolean;
}

function SaveButton({
  control,
  originalDisplayName,
  hasNewFavicon,
  removeFavicon,
  colorDirty,
  colorValid,
  isUpdating,
}: SaveButtonProps) {
  const { t } = useTranslation('admin-settings-organization');
  const displayName = useWatch({ control, name: 'displayName' });
  const isDirty =
    (displayName ?? '').trim() !== originalDisplayName ||
    hasNewFavicon ||
    removeFavicon ||
    colorDirty;

  return (
    <Button type="submit" disabled={isUpdating || !isDirty || !colorValid}>
      {isUpdating ? t('organization.saving') : t('organization.save')}
    </Button>
  );
}

export function OrganizationSettingsPage() {
  const { t } = useTranslation('admin-settings-organization');
  const { branding, isLoading } = useBranding();
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [removeFavicon, setRemoveFavicon] = useState(false);
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [colorValid, setColorValid] = useState(true);
  const [colorTouched, setColorTouched] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { displayName: '' },
  });

  // Sync the form input with the saved display name whenever it loads or
  // changes externally (e.g., after a successful save reflows the cache).
  useEffect(() => {
    if (branding) form.reset({ displayName: branding.displayName ?? '' });
  }, [branding, form]);

  const { updateBranding, isUpdating } = useUpdateBranding(() => {
    setFaviconFile(null);
    setRemoveFavicon(false);
    setColorTouched(false);
  });

  useEffect(() => {
    // Sync local primaryColor with the server value, but only while the user
    // hasn't started editing. The setState-in-effect is the synchronization
    // pattern recommended by React when the canonical source can change
    // externally (e.g., another tab saved a new color).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!colorTouched) setPrimaryColor(branding?.primaryColor ?? null);
  }, [branding?.primaryColor, colorTouched]);

  // Local object-URL preview of a pending favicon file, so the live preview
  // can show the user's choice before they hit Save.
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!faviconFile) {
      // Clearing the preview is part of the effect's synchronization with
      // `faviconFile` — not a cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFaviconPreview(null);
      return;
    }
    const url = URL.createObjectURL(faviconFile);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFaviconPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [faviconFile]);

  // Dominant colors sampled from the current logo (pending file or saved
  // favicon). Powers the "from your logo" suggestion chips in BrandColorField.
  const [suggestedColors, setSuggestedColors] = useState<string[]>([]);
  useEffect(() => {
    const source: File | string | null =
      faviconFile ?? (removeFavicon ? null : (branding?.faviconUrl ?? null));
    let cancelled = false;
    const task = source
      ? extractLogoColors(source)
      : Promise.resolve<string[]>([]);
    task
      .then((colors) => {
        if (!cancelled) setSuggestedColors(colors);
      })
      .catch(() => {
        if (!cancelled) setSuggestedColors([]);
      });
    return () => {
      cancelled = true;
    };
  }, [faviconFile, removeFavicon, branding?.faviconUrl]);

  const previewFavicon =
    faviconPreview ?? (removeFavicon ? null : (branding?.faviconUrl ?? null));
  const watchedDisplayName = useWatch({
    control: form.control,
    name: 'displayName',
  });
  // Preview mirrors the input value; an empty display name falls back to the
  // platform default, exactly like the real sidebar.
  const previewName = (watchedDisplayName ?? '').trim() || config.app.name;
  // When the user hasn't picked a custom color, leave both null so the
  // preview falls back to `bg-primary text-primary-foreground` tokens —
  // i.e., whatever the app's design system primary currently is. Only
  // compute foreground contrast for actual user-picked hex values.
  const previewPrimary =
    primaryColor && isValidHex(primaryColor) ? primaryColor : null;
  const previewForeground = previewPrimary
    ? bestForegroundContrast(previewPrimary).foreground
    : null;

  function handleFileChange(file: File | null) {
    setFaviconFile(file);
    if (file) setRemoveFavicon(false);
  }

  function handleRemove() {
    setFaviconFile(null);
    setRemoveFavicon(true);
  }

  function handleColorChange(next: string | null) {
    setPrimaryColor(next);
    setColorTouched(true);
  }

  function onSubmit(data: FormValues) {
    const originalColor = branding?.primaryColor ?? null;
    const colorDirty = colorTouched && primaryColor !== originalColor;
    updateBranding({
      // Empty string clears the display name (backend stores null -> the
      // sidebar falls back to the platform default).
      displayName: data.displayName.trim(),
      favicon: faviconFile ?? undefined,
      removeFavicon,
      primaryColor: colorDirty && primaryColor ? primaryColor : undefined,
      resetPrimaryColor: colorDirty && primaryColor === null,
    });
  }

  const originalColor = branding?.primaryColor ?? null;
  const colorDirty = colorTouched && primaryColor !== originalColor;

  if (isLoading) {
    return (
      <SettingsLayout title={t('organization.title')}>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title={t('organization.title')}>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            void form.handleSubmit(onSubmit)(e);
          }}
          className="space-y-6"
        >
          <Card className="border-brand/40 bg-brand/[0.03]">
            <CardHeader>
              <CardTitle>{t('organization.previewTitle')}</CardTitle>
              <CardDescription>
                {t('organization.previewDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SidebarPreview
                favicon={previewFavicon}
                name={previewName}
                primaryColor={previewPrimary}
                primaryForeground={previewForeground}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('organization.identityLabel')}</CardTitle>
              <CardDescription>
                {t('organization.identityDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('organization.displayNameLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('organization.displayNamePlaceholder')}
                        disabled={isUpdating}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-2">
                <Label>{t('organization.faviconLabel')}</Label>
                <LogoUploadField
                  currentUrl={branding?.faviconUrl}
                  pendingFile={faviconFile}
                  pendingPreview={faviconPreview}
                  removed={removeFavicon}
                  disabled={isUpdating}
                  onChange={handleFileChange}
                  onRemove={handleRemove}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('organization.colorLabel')}</CardTitle>
              <CardDescription>
                {t('organization.colorDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BrandColorField
                value={primaryColor}
                disabled={isUpdating}
                suggestedColors={suggestedColors}
                onChange={handleColorChange}
                onValidityChange={setColorValid}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <SaveButton
              control={form.control}
              originalDisplayName={branding?.displayName ?? ''}
              hasNewFavicon={faviconFile !== null}
              removeFavicon={removeFavicon}
              colorDirty={colorDirty}
              colorValid={colorValid}
              isUpdating={isUpdating}
            />
          </div>
        </form>
      </Form>
    </SettingsLayout>
  );
}
