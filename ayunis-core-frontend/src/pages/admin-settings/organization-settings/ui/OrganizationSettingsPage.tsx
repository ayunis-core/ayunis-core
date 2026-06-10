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
import { Button } from '@/shared/ui/shadcn/button';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import { useBranding } from '@/features/useBranding';
import { useUpdateBranding } from '../api/useUpdateBranding';
import { LogoUploadField } from './LogoUploadField';

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
  isUpdating: boolean;
}

function SaveButton({
  control,
  originalDisplayName,
  hasNewFavicon,
  removeFavicon,
  isUpdating,
}: SaveButtonProps) {
  const { t } = useTranslation('admin-settings-organization');
  const displayName = useWatch({ control, name: 'displayName' });
  const isDirty =
    (displayName ?? '').trim() !== originalDisplayName ||
    hasNewFavicon ||
    removeFavicon;

  return (
    <Button type="submit" disabled={isUpdating || !isDirty}>
      {isUpdating ? t('organization.saving') : t('organization.save')}
    </Button>
  );
}

export function OrganizationSettingsPage() {
  const { t } = useTranslation('admin-settings-organization');
  const { branding, isLoading } = useBranding();
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [removeFavicon, setRemoveFavicon] = useState(false);

  const { updateBranding, isUpdating } = useUpdateBranding(() => {
    setFaviconFile(null);
    setRemoveFavicon(false);
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { displayName: '' },
  });

  // When no branding row exists the backend returns the org name as
  // displayName.  Treat that the same as null (platform default) so the
  // field stays empty — matching the "leave empty for platform default" copy.
  const effectiveDisplayName =
    branding?.displayName != null && branding.displayName !== branding.name
      ? branding.displayName
      : '';

  useEffect(() => {
    if (branding) form.reset({ displayName: effectiveDisplayName });
  }, [branding, form, effectiveDisplayName]);

  function handleFileChange(file: File | null) {
    setFaviconFile(file);
    if (file) setRemoveFavicon(false);
  }

  function handleRemove() {
    setFaviconFile(null);
    setRemoveFavicon(true);
  }

  function onSubmit(data: FormValues) {
    updateBranding({
      // Empty string clears the display name (backend stores null -> the
      // sidebar falls back to the platform default).
      displayName: data.displayName.trim(),
      favicon: faviconFile ?? undefined,
      removeFavicon,
    });
  }

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
          <Card>
            <CardHeader>
              <CardTitle>{t('organization.displayNameLabel')}</CardTitle>
              <CardDescription>
                {t('organization.displayNameDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('organization.faviconLabel')}</CardTitle>
              <CardDescription>
                {t('organization.faviconDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LogoUploadField
                currentUrl={branding?.faviconUrl}
                pendingFile={faviconFile}
                removed={removeFavicon}
                disabled={isUpdating}
                onChange={handleFileChange}
                onRemove={handleRemove}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <SaveButton
              control={form.control}
              originalDisplayName={effectiveDisplayName}
              hasNewFavicon={faviconFile !== null}
              removeFavicon={removeFavicon}
              isUpdating={isUpdating}
            />
          </div>
        </form>
      </Form>
    </SettingsLayout>
  );
}
