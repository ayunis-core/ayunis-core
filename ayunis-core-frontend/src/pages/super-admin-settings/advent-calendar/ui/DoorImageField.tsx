import { useEffect, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ImageIcon } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ayunis/ui/components/form';
import {
  DOOR_IMAGE_ACCEPT,
  DOOR_IMAGE_MAX_BYTES,
} from '@/pages/super-admin-settings/advent-calendar/model/constants';
import type { DoorFormFields } from '@/pages/super-admin-settings/advent-calendar/model/types';

interface DoorImageFieldProps {
  savedImageUrl: string | null;
  disabled: boolean;
}

function useFilePreviewUrl(file: File | null): string | null {
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(
    null,
  );
  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreview({ file, url: reader.result });
      }
    };
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);
  return file && preview?.file === file ? preview.url : null;
}

export default function DoorImageField({
  savedImageUrl,
  disabled,
}: Readonly<DoorImageFieldProps>) {
  const { t } = useTranslation('super-admin-settings-advent-calendar');
  const form = useFormContext<DoorFormFields>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageFile, keepSavedImage] = useWatch({
    control: form.control,
    name: ['imageFile', 'keepSavedImage'],
  });
  const previewUrl = useFilePreviewUrl(imageFile);
  const thumbnailUrl = previewUrl ?? (keepSavedImage ? savedImageUrl : null);

  function selectFile(file: File | undefined) {
    if (!file) return;
    form.setValue('imageFile', file, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function removeImage() {
    form.clearErrors('imageFile');
    form.setValue('imageFile', null, { shouldDirty: true });
    form.setValue('keepSavedImage', false, { shouldDirty: true });
  }

  return (
    <FormField
      control={form.control}
      name="imageFile"
      rules={{
        validate: (file, values) =>
          values.mediaKind !== 'image' ||
          !file ||
          file.size <= DOOR_IMAGE_MAX_BYTES ||
          t('validation.imageFile.tooLarge'),
      }}
      render={() => (
        <FormItem>
          <FormLabel>{t('media.image')}</FormLabel>
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  data-testid="advent-calendar-door-image-thumbnail"
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="file"
                accept={DOOR_IMAGE_ACCEPT}
                className="hidden"
                data-testid="advent-calendar-door-image-file"
                onChange={(e) => {
                  selectFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => inputRef.current?.click()}
              >
                {thumbnailUrl
                  ? t('media.replaceImage')
                  : t('media.uploadImage')}
              </Button>
              {thumbnailUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={disabled}
                  onClick={removeImage}
                  data-testid="advent-calendar-door-image-remove"
                >
                  {t('media.removeImage')}
                </Button>
              )}
            </div>
          </div>
          <FormDescription>{t('media.imageDescription')}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
