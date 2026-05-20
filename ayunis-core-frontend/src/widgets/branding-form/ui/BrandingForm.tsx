import { useEffect, useState } from 'react';
import { useForm, useWatch, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
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
import type { BrandingResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import config from '@/shared/config';
import { BrandColorField } from './BrandColorField';
import { LogoUploadField } from './LogoUploadField';
import { SidebarPreview } from './SidebarPreview';
import { bestForegroundContrast, isValidHex } from '../lib/color-utils';
import { extractLogoColors } from '../lib/extract-logo-colors';

export interface BrandingFormSubmitParams {
  name?: string;
  // Empty string clears the display name server-side and falls back to the
  // platform default in the sidebar. undefined leaves it unchanged.
  displayName?: string;
  favicon?: File;
  removeFavicon?: boolean;
  primaryColor?: string;
  resetPrimaryColor?: boolean;
}

interface BrandingFormProps {
  branding: BrandingResponseDto | undefined;
  isLoading: boolean;
  isUpdating: boolean;
  onSubmit: (params: BrandingFormSubmitParams) => void;
  orgId?: string;
  showPreview?: boolean;
}

function createFormSchema() {
  return z.object({
    name: z.string(),
    displayName: z.string(),
  });
}

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

interface SaveButtonProps {
  control: Control<FormValues>;
  originalName: string;
  originalDisplayName: string;
  hasNewFavicon: boolean;
  removeFavicon: boolean;
  colorDirty: boolean;
  colorValid: boolean;
  isUpdating: boolean;
}

function SaveButton({
  control,
  originalName,
  originalDisplayName,
  hasNewFavicon,
  removeFavicon,
  colorDirty,
  colorValid,
  isUpdating,
}: Readonly<SaveButtonProps>) {
  const { t } = useTranslation('admin-settings-organization');
  const name = useWatch({ control, name: 'name' });
  const displayName = useWatch({ control, name: 'displayName' });
  const trimmedName = name.trim();
  const nameDirty = trimmedName.length > 0 && trimmedName !== originalName;
  const displayNameDirty = displayName.trim() !== originalDisplayName;
  const isDirty =
    nameDirty ||
    displayNameDirty ||
    hasNewFavicon ||
    removeFavicon ||
    colorDirty;

  return (
    <Button type="submit" disabled={isUpdating || !isDirty || !colorValid}>
      {isUpdating ? t('organization.saving') : t('organization.save')}
    </Button>
  );
}

export function BrandingForm({
  branding,
  isLoading,
  isUpdating,
  onSubmit,
  orgId,
  showPreview = true,
}: Readonly<BrandingFormProps>) {
  const { t } = useTranslation('admin-settings-organization');
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [removeFavicon, setRemoveFavicon] = useState(false);
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);
  const [colorValid, setColorValid] = useState(true);
  const [colorTouched, setColorTouched] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema()),
    defaultValues: { name: '', displayName: '' },
  });

  useEffect(() => {
    if (branding?.name !== undefined) {
      form.reset({
        name: branding.name,
        displayName: branding.displayName ?? '',
      });
    }
  }, [branding?.name, branding?.displayName, form]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!colorTouched) setPrimaryColor(branding?.primaryColor ?? null);
  }, [branding?.primaryColor, colorTouched]);

  // Local state (faviconFile, removeFavicon, colorTouched) is NOT reset
  // here on save success. The caller must force a remount via a changing
  // `key` prop on its mutation's onSuccess. This keeps unsaved changes
  // alive when a save fails (instead of wiping them on every mutation
  // transition).
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!faviconFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFaviconPreview(null);
      return;
    }
    const url = URL.createObjectURL(faviconFile);

    setFaviconPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [faviconFile]);

  const colorSource: File | string | null =
    faviconFile ?? (removeFavicon ? null : (branding?.faviconUrl ?? null));
  const colorSourceKey =
    colorSource instanceof File
      ? `f:${colorSource.name}:${colorSource.size}`
      : (colorSource ?? 'none');
  const [extracted, setExtracted] = useState<{
    key: string;
    colors: string[];
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const task = colorSource
      ? extractLogoColors(colorSource)
      : Promise.resolve<string[]>([]);
    task
      .then((colors) => {
        if (!cancelled) setExtracted({ key: colorSourceKey, colors });
      })
      .catch(() => {
        if (!cancelled) setExtracted({ key: colorSourceKey, colors: [] });
      });
    return () => {
      cancelled = true;
    };
    // colorSource is a new reference each render when it's a File; only
    // depend on the stable string key so the effect re-runs on actual
    // source changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorSourceKey]);
  const isExtractingColors =
    colorSource !== null && extracted?.key !== colorSourceKey;
  const suggestedColors: string[] | null = isExtractingColors
    ? null
    : (extracted?.colors ?? []);

  const previewFavicon =
    faviconPreview ?? (removeFavicon ? null : (branding?.faviconUrl ?? null));
  const watchedDisplayName = useWatch({
    control: form.control,
    name: 'displayName',
  });
  // The preview mirrors the sidebar: display name, falling back to the
  // platform default when empty.
  const previewName = watchedDisplayName.trim() || config.app.name;
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

  function handleSubmit(data: FormValues) {
    const originalColor = branding?.primaryColor ?? null;
    const originalName = branding?.name ?? '';
    const originalDisplayName = branding?.displayName ?? '';
    const colorDirty = colorTouched && primaryColor !== originalColor;
    const trimmedName = data.name.trim();
    // The canonical name is only editable in super-admin mode (orgId set).
    const nameToSave =
      orgId && trimmedName.length > 0 && trimmedName !== originalName
        ? trimmedName
        : undefined;
    // Only send displayName if it actually changed. Empty string is a valid
    // "clear" signal (server treats it as null -> platform default in sidebar).
    const displayNameToSave =
      data.displayName.trim() !== originalDisplayName
        ? data.displayName
        : undefined;
    onSubmit({
      name: nameToSave,
      displayName: displayNameToSave,
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
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Scope the live brand color preview only when the preview card is
  // shown (admin mode). In super-admin mode the form is platform-neutral
  // — the save button must keep the default --primary, not the org being
  // edited.
  const formStyle: React.CSSProperties | undefined =
    showPreview && previewPrimary && previewForeground
      ? ({
          '--primary': previewPrimary,
          '--primary-foreground': previewForeground,
        } as React.CSSProperties)
      : undefined;

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          void form.handleSubmit(handleSubmit)(e);
        }}
        className="space-y-6"
        style={formStyle}
      >
        {showPreview && (
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
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t('organization.identityLabel')}</CardTitle>
            <CardDescription>
              {t('organization.identityDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {orgId && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('organization.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('organization.namePlaceholder')}
                        disabled={isUpdating}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t('organization.nameHint')}
                      {' · ID: '}
                      <span className="font-mono">{orgId}</span>
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
                  <p className="text-xs text-muted-foreground">
                    {t('organization.displayNameHint')}
                  </p>
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
            originalName={branding?.name ?? ''}
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
  );
}
